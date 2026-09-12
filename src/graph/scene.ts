import type { GraphData } from "../core/types";
import { createGraphCanvas, svgElement } from "./canvas";
import { groupColor } from "./filter";
import { createGraphGestures } from "./gestures";
import { visibleLabelIds } from "./label-layout";
import type { GraphSettings } from "./settings";
import {
  createGraphSimulation,
  type GraphDimensions,
  type GraphSimulation,
  type RenderEdge,
  type RenderNode,
} from "./simulation";

type SceneOptions = {
  readonly stage: HTMLElement;
  readonly onOpen: (id: string) => void;
  readonly onReset: () => void;
};
export type SceneRenderOptions = {
  readonly data: GraphData;
  readonly active: string;
  readonly settings: GraphSettings;
  readonly paused: boolean;
};
export type GraphScene = {
  render(options: SceneRenderOptions): void;
  reheat(): void;
  setPaused(value: boolean): void;
  zoom(factor: number): void;
  fit(): void;
  reset(): void;
  destroy(): void;
};
type SavedPosition = Pick<RenderNode, "x" | "y" | "vx" | "vy" | "fx" | "fy">;
type LabelMetric = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export function createGraphScene(options: SceneOptions): GraphScene {
  let paused = false;
  let simulation: GraphSimulation | undefined;
  let nodes: RenderNode[] = [];
  let edges: RenderEdge[] = [];
  let groups: SVGGElement[] = [];
  let labelMetrics: readonly LabelMetric[] = [];
  let active = "";
  let hovering = "";
  let labelsVisible = true;
  let nodeScale = 1;
  let paintNodes = (): void => {};
  const positions = new Map<string, SavedPosition>();
  const canvas = createGraphCanvas();
  const empty = document.createElement("div");
  empty.className = "graph-empty";
  empty.append("현재 필터와 일치하는 노트가 없습니다. ");
  const clearFilters = document.createElement("button");
  clearFilters.className = "button primary";
  clearFilters.type = "button";
  clearFilters.textContent = "그래프 초기화";
  clearFilters.addEventListener("click", options.onReset);
  empty.append(clearFilters);
  options.stage.append(canvas.svg, empty);
  const dimensions = (): GraphDimensions => {
    const rect = options.stage.getBoundingClientRect();
    return { x: Math.max(1, rect.width), y: Math.max(1, rect.height) };
  };
  const reheat = () => {
    if (!paused) simulation?.instance.alpha(0.7).restart();
  };
  const gestures = createGraphGestures({
    svg: canvas.svg,
    viewport: canvas.viewport,
    dimensions,
    onReheat: reheat,
    onLabelVisibility(value) {
      labelsVisible = value;
      applyLabelLayout();
    },
  });
  const resize = new ResizeObserver(() => {
    const rect = options.stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    simulation?.setDimensions({ x: rect.width, y: rect.height });
    if (paused) {
      simulation?.centerImmediately();
      paintNodes();
      return;
    }
    reheat();
  });
  resize.observe(options.stage);

  function endpoint(value: string | number | RenderNode): RenderNode | undefined {
    return typeof value === "object" ? value : nodes.find((node) => node.id === value);
  }
  function savePositions(): void {
    for (const node of nodes) {
      positions.set(node.id, {
        x: node.x,
        y: node.y,
        vx: node.vx,
        vy: node.vy,
        fx: node.fx,
        fy: node.fy,
      });
    }
  }
  function applyLabelLayout(): void {
    const labels = nodes.flatMap((node, index) => {
      const metric = labelMetrics[index];
      if (!metric) return [];
      return [
        {
          id: node.id,
          x: (node.x ?? 0) + metric.x,
          y: (node.y ?? 0) + metric.y,
          width: metric.width,
          height: metric.height,
          priority: node.id === hovering ? 3 : node.id === active ? 2 : 1,
        },
      ];
    });
    const obstacles = nodes.map((node) => ({
      id: node.id,
      x: (node.x ?? 0) - (node.id === active ? 9 : 6) * nodeScale,
      y: (node.y ?? 0) - (node.id === active ? 9 : 6) * nodeScale,
      width: (node.id === active ? 18 : 12) * nodeScale,
      height: (node.id === active ? 18 : 12) * nodeScale,
      priority: 4,
    }));
    const visible = visibleLabelIds(labels, obstacles);
    groups.forEach((group, index) => {
      const text = group.querySelector<SVGTextElement>("text");
      text?.toggleAttribute("hidden", !labelsVisible || !visible.has(nodes[index]?.id ?? ""));
    });
  }
  function render(renderOptions: SceneRenderOptions): void {
    simulation?.instance.stop();
    paused = renderOptions.paused;
    active = renderOptions.active;
    nodeScale = renderOptions.settings.nodeScale;
    hovering = "";
    savePositions();
    nodes = renderOptions.data.nodes.map((node) => ({
      ...node,
      ...(positions.get(node.id) ?? {}),
    }));
    edges = renderOptions.data.edges.map((edge) => ({ ...edge }));
    empty.hidden = nodes.length > 0;
    canvas.edgeLayer.replaceChildren();
    canvas.nodeLayer.replaceChildren();
    const lines = edges.map(() => {
      const line = svgElement("line");
      line.setAttribute("stroke-width", String(renderOptions.settings.edgeWidth));
      if (renderOptions.settings.arrows) {
        line.setAttribute("marker-end", `url(#${canvas.arrowMarkerId})`);
      }
      canvas.edgeLayer.append(line);
      return line;
    });
    groups = nodes.map((node) => {
      const group = svgElement("g");
      group.classList.add("graph-node");
      group.setAttribute("data-kind", node.kind);
      const circle = svgElement("circle");
      const radius = (node.id === renderOptions.active ? 9 : 6) * renderOptions.settings.nodeScale;
      circle.setAttribute("r", String(radius));
      circle.setAttribute("fill", groupColor(node, renderOptions.settings.groups));
      const title = svgElement("title");
      title.textContent = node.label;
      const label = svgElement("text");
      label.textContent = node.label;
      label.setAttribute("x", String(radius + 4));
      label.setAttribute("dy", "0.35em");
      group.append(circle, title, label);
      group.addEventListener("pointerdown", (event) => gestures.startDrag(event, node, circle));
      canvas.nodeLayer.append(group);
      return group;
    });
    labelMetrics = groups.map((group, index) => {
      const text = group.querySelector<SVGTextElement>("text");
      const box = text?.getBBox?.();
      return {
        x: box?.x ?? (nodes[index]?.id === active ? 9 : 6) * nodeScale + 4,
        y: box?.y ?? -7,
        width: Math.max(box?.width ?? 0, (nodes[index]?.label.length ?? 0) * 7),
        height: Math.max(box?.height ?? 0, 14),
      };
    });
    gestures.setLabelThreshold(renderOptions.settings.labelThreshold);
    const updateHighlights = () => {
      const related = new Set<string>();
      for (const edge of edges) {
        const source = endpoint(edge.source)?.id;
        const target = endpoint(edge.target)?.id;
        if (source === hovering && target) related.add(target);
        if (target === hovering && source) related.add(source);
      }
      groups.forEach((group, index) => {
        const node = nodes[index];
        group.classList.toggle(
          "is-muted",
          Boolean(hovering && node?.id !== hovering && !related.has(node?.id ?? "")),
        );
      });
      lines.forEach((line, index) => {
        const edge = edges[index];
        line.classList.toggle(
          "is-highlighted",
          Boolean(
            edge &&
              (endpoint(edge.source)?.id === hovering || endpoint(edge.target)?.id === hovering),
          ),
        );
      });
    };
    groups.forEach((group, index) => {
      const node = nodes[index];
      if (!node) return;
      group.addEventListener("pointerenter", () => {
        hovering = node.id;
        updateHighlights();
        applyLabelLayout();
      });
      group.addEventListener("pointerleave", () => {
        hovering = "";
        updateHighlights();
        applyLabelLayout();
      });
      group.addEventListener("click", () => {
        if (!gestures.consumeDrag()) options.onOpen(node.id);
      });
    });
    paintNodes = () => {
      lines.forEach((line, index) => {
        const edge = edges[index];
        if (!edge) return;
        const source = endpoint(edge.source);
        const target = endpoint(edge.target);
        if (!source || !target) return;
        line.setAttribute("x1", String(source.x ?? 0));
        line.setAttribute("y1", String(source.y ?? 0));
        line.setAttribute("x2", String(target.x ?? 0));
        line.setAttribute("y2", String(target.y ?? 0));
      });
      groups.forEach((group, index) => {
        const node = nodes[index];
        if (node) group.setAttribute("transform", `translate(${node.x ?? 0} ${node.y ?? 0})`);
      });
      applyLabelLayout();
    };
    simulation = createGraphSimulation({
      nodes,
      edges,
      dimensions: dimensions(),
      settings: renderOptions.settings,
      onTick: paintNodes,
    });
    simulation.instance.tick();
    paintNodes();
    if (paused) simulation.instance.stop();
  }

  return {
    render,
    reheat,
    setPaused(value) {
      paused = value;
      if (paused) simulation?.instance.stop();
      else reheat();
    },
    zoom(factor) {
      gestures.zoom(factor);
    },
    fit() {
      gestures.fit(nodes);
    },
    reset() {
      positions.clear();
      gestures.reset();
    },
    destroy() {
      simulation?.instance.stop();
      resize.disconnect();
      gestures.destroy();
    },
  };
}
