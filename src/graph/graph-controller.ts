import type { GraphData } from "../core/types";
import { createGraphControls } from "./controls";
import { filterGraph } from "./filter";
import { createGraphScene } from "./scene";
import { defaultGraphSettings, readGraphSettings, saveGraphSettings } from "./settings";

export type CreateGraphOptions = {
  readonly parent: HTMLElement;
  readonly data: GraphData;
  readonly active: string;
  readonly onOpen: (id: string) => void;
  readonly local: boolean;
};
export type GraphView = {
  update(data: GraphData, active: string): void;
  setLocal(local: boolean): void;
  destroy(): void;
};

function modificationTimes(data: GraphData): readonly number[] {
  return [...new Set(data.nodes.map((node) => node.modified))].sort((left, right) => left - right);
}

export function createGraphController(options: CreateGraphOptions): GraphView {
  let data = options.data;
  let active = options.active;
  let local = options.local;
  let settings = readGraphSettings();
  let search = "";
  let timelineEnabled = false;
  let timeline = 0;
  let timelineTimer: number | undefined;
  let paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let destroyed = false;
  const root = document.createElement("section");
  root.className = "graph-view";
  const stage = document.createElement("div");
  stage.className = "graph-stage";
  const scene = createGraphScene({ stage, onOpen: options.onOpen, onReset: reset });
  const controls = createGraphControls({
    settings,
    local,
    onLocal(value) {
      local = value;
      render();
    },
    onDepth(value) {
      settings = { ...settings, depth: value };
      persistAndRender();
    },
    onSearch(value) {
      search = value;
      render();
    },
    onTimeline(value, enabled) {
      timeline = value;
      timelineEnabled = enabled;
      stopTimeline();
      render();
    },
    onSettings(value) {
      settings = value;
      persistAndRender();
    },
    onAction(action) {
      if (action === "fit") scene.fit();
      if (action === "reheat") scene.reheat();
      if (action === "pause") togglePause();
      if (action === "reset") reset();
      if (action === "timeline") toggleTimeline();
      if (action === "zoom-in") scene.zoom(1.2);
      if (action === "zoom-out") scene.zoom(0.8);
    },
    onOpen: options.onOpen,
  });
  root.append(controls.root, stage);
  options.parent.replaceChildren(root);

  function persistAndRender(): void {
    controls.setPersistenceFailed(!saveGraphSettings(settings));
    controls.setSettings(settings);
    render();
  }
  function timelineValue(): number {
    const times = modificationTimes(data);
    return times[Math.min(timeline, Math.max(0, times.length - 1))] ?? 0;
  }
  function stopTimeline(): void {
    if (timelineTimer !== undefined) window.clearInterval(timelineTimer);
    timelineTimer = undefined;
    controls.setTimelinePlaying(false);
  }
  function toggleTimeline(): void {
    if (timelineTimer !== undefined) {
      stopTimeline();
      return;
    }
    const maximum = Math.max(0, modificationTimes(data).length - 1);
    timelineEnabled = true;
    timeline = 0;
    if (maximum === 0) {
      render();
      return;
    }
    controls.setTimelinePlaying(true);
    render();
    timelineTimer = window.setInterval(() => {
      timeline += 1;
      render();
      if (timeline >= maximum) stopTimeline();
    }, 450);
  }
  function togglePause(): void {
    paused = !paused;
    scene.setPaused(paused);
    controls.setPaused(paused);
  }
  function reset(): void {
    settings = defaultGraphSettings;
    search = "";
    timelineEnabled = false;
    timeline = 0;
    stopTimeline();
    scene.reset();
    controls.setPersistenceFailed(!saveGraphSettings(settings));
    controls.setSettings(settings);
    controls.setSearch(search);
    render();
  }
  function render(): void {
    if (destroyed) return;
    const result = filterGraph(data, {
      local,
      active,
      depth: settings.depth,
      search,
      showTags: settings.showTags,
      showAssets: settings.showAssets,
      showMissing: settings.showMissing,
      showOrphans: settings.showOrphans,
      ...(timelineEnabled ? { timeline: timelineValue() } : {}),
    });
    controls.setNodes(result.nodes, active);
    controls.setTimeline(
      Math.max(0, modificationTimes(data).length - 1),
      timeline,
      timelineEnabled,
    );
    scene.render({ data: result, active, settings, paused });
    controls.setPaused(paused);
  }
  render();
  return {
    update(nextData, nextActive) {
      data = nextData;
      active = nextActive;
      timeline = 0;
      render();
    },
    setLocal(value) {
      local = value;
      controls.setLocal(value);
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopTimeline();
      controls.destroy();
      scene.destroy();
      root.remove();
    },
  };
}
