import type { GraphNode } from "../core/types";
import type { GraphSettings } from "./settings";
import { createSettingsPanel } from "./settings-panel";

type Action = "fit" | "reset" | "reheat" | "pause" | "timeline" | "zoom-in" | "zoom-out";
export type GraphControls = {
  readonly root: HTMLElement;
  setLocal(value: boolean): void;
  setSearch(value: string): void;
  setSettings(value: GraphSettings): void;
  setPaused(value: boolean): void;
  setNodes(nodes: readonly GraphNode[], active: string): void;
  setTimeline(maximum: number, value: number, enabled: boolean): void;
  setTimelinePlaying(value: boolean): void;
  setPersistenceFailed(value: boolean): void;
};
export type GraphControlsOptions = {
  readonly settings: GraphSettings;
  readonly local: boolean;
  readonly onLocal: (value: boolean) => void;
  readonly onDepth: (value: number) => void;
  readonly onSearch: (value: string) => void;
  readonly onTimeline: (value: number, enabled: boolean) => void;
  readonly onSettings: (value: GraphSettings) => void;
  readonly onAction: (action: Action) => void;
  readonly onOpen: (id: string) => void;
};

function button(label: string, action: () => void, className = "button subtle"): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  node.className = className;
  node.textContent = label;
  node.addEventListener("click", action);
  return node;
}
function field(label: string, control: HTMLElement): HTMLLabelElement {
  const node = document.createElement("label");
  const text = document.createElement("span");
  node.className = "graph-field";
  text.textContent = label;
  node.append(text, control);
  return node;
}

export function createGraphControls(options: GraphControlsOptions): GraphControls {
  const root = document.createElement("div");
  root.className = "graph-shell";
  const toolbar = document.createElement("div");
  toolbar.className = "graph-toolbar";
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "노트, 경로, 태그 검색";
  search.setAttribute("aria-label", "그래프 노트, 경로, 태그 검색");
  let timer = 0;
  search.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => options.onSearch(search.value), 120);
  });
  const local = document.createElement("input");
  local.type = "checkbox";
  local.checked = options.local;
  local.addEventListener("change", () => options.onLocal(local.checked));
  const depth = document.createElement("select");
  for (let value = 1; value <= 5; value += 1) {
    const item = document.createElement("option");
    item.value = String(value);
    item.textContent = `${value}단계`;
    depth.append(item);
  }
  depth.value = String(options.settings.depth);
  depth.addEventListener("change", () => options.onDepth(Number(depth.value)));
  const pause = button("일시정지", () => options.onAction("pause"));
  const notice = document.createElement("span");
  notice.className = "muted";
  notice.hidden = true;
  notice.textContent = "설정은 이번 창에서만 유지됩니다";
  const panel = createSettingsPanel(options.settings, options.onSettings);
  const settingsButton = button("설정", () => {
    panel.root.classList.toggle("is-open");
    settingsButton.setAttribute("aria-expanded", String(panel.root.classList.contains("is-open")));
  });
  settingsButton.setAttribute("aria-expanded", "false");
  toolbar.append(search, field("로컬", local), field("깊이", depth), pause, notice);
  for (const [label, action] of [
    ["축소", "zoom-out"],
    ["확대", "zoom-in"],
    ["맞춤", "fit"],
    ["재가열", "reheat"],
    ["초기화", "reset"],
  ] as const)
    toolbar.append(button(label, () => options.onAction(action)));
  toolbar.append(settingsButton);
  const timeline = document.createElement("div");
  timeline.className = "graph-timeline";
  const enabled = document.createElement("input");
  enabled.type = "checkbox";
  const range = document.createElement("input");
  range.type = "range";
  range.min = "0";
  const updateTimeline = () => options.onTimeline(Number(range.value), enabled.checked);
  enabled.addEventListener("change", updateTimeline);
  range.addEventListener("input", updateTimeline);
  const history = button("기록 재생", () => options.onAction("timeline"));
  timeline.append(field("수정 순서", enabled), range, history);
  const list = document.createElement("nav");
  list.className = "graph-list";
  list.setAttribute("aria-label", "표시된 그래프 노트");
  const listButton = button("노트 목록", () => {
    list.classList.toggle("is-open");
    listButton.setAttribute("aria-expanded", String(list.classList.contains("is-open")));
  });
  listButton.setAttribute("aria-expanded", "false");
  listButton.setAttribute("aria-controls", "graph-note-list");
  list.id = "graph-note-list";
  range.setAttribute("aria-label", "수정 시점");
  toolbar.append(listButton);
  root.append(toolbar, timeline, panel.root, list);
  return {
    root,
    setLocal(value) {
      local.checked = value;
    },
    setSearch(value) {
      search.value = value;
    },
    setSettings(value) {
      depth.value = String(value.depth);
      panel.setSettings(value);
    },
    setPaused(value) {
      pause.textContent = value ? "재생" : "일시정지";
      pause.setAttribute("aria-pressed", String(value));
    },
    setNodes(nodes, active) {
      list.replaceChildren(
        ...nodes.map((node) => {
          const item = button(node.label, () => options.onOpen(node.id));
          item.className = "graph-list-item";
          item.setAttribute("aria-current", String(node.id === active));
          return item;
        }),
      );
    },
    setTimeline(maximum, value, valueEnabled) {
      range.max = String(maximum);
      range.value = String(value);
      range.disabled = maximum === 0;
      enabled.checked = valueEnabled;
    },
    setTimelinePlaying(value) {
      history.textContent = value ? "기록 정지" : "기록 재생";
      history.setAttribute("aria-pressed", String(value));
    },
    setPersistenceFailed(value) {
      notice.hidden = !value;
    },
  };
}
