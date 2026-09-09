import type { GraphDimensions, RenderNode } from "./simulation";

type Transform = { x: number; y: number; k: number };
type ClientPoint = { readonly x: number; readonly y: number };
type GraphGesturesOptions = {
  readonly svg: SVGSVGElement;
  readonly viewport: SVGGElement;
  readonly nodeLayer: SVGGElement;
  readonly dimensions: () => GraphDimensions;
  readonly onReheat: () => void;
};
export type GraphGestures = {
  setLabelThreshold(value: number): void;
  startDrag(event: PointerEvent, node: RenderNode, circle: SVGCircleElement): void;
  consumeDrag(): boolean;
  zoom(factor: number): void;
  fit(nodes: readonly RenderNode[]): void;
  reset(): void;
  destroy(): void;
};

function clampScale(value: number): number {
  return Math.min(4, Math.max(0.25, value));
}

export function createGraphGestures(options: GraphGesturesOptions): GraphGestures {
  let transform: Transform = { x: 0, y: 0, k: 1 };
  let labelThreshold = 0.7;
  let panning: ClientPoint | undefined;
  let dragged: RenderNode | undefined;
  let didDrag = false;
  const paint = () => {
    options.viewport.setAttribute(
      "transform",
      `translate(${transform.x} ${transform.y}) scale(${transform.k})`,
    );
    options.nodeLayer.querySelectorAll<SVGTextElement>("text").forEach((label) => {
      label.toggleAttribute("hidden", transform.k < labelThreshold);
    });
  };
  const point = (event: PointerEvent): GraphDimensions => {
    const rect = options.svg.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - transform.x) / transform.k,
      y: (event.clientY - rect.top - transform.y) / transform.k,
    };
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const rect = options.svg.getBoundingClientRect();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    const next = clampScale(transform.k * factor);
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    transform = {
      x: x - ((x - transform.x) * next) / transform.k,
      y: y - ((y - transform.y) * next) / transform.k,
      k: next,
    };
    paint();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (dragged) {
      didDrag = true;
      const next = point(event);
      dragged.fx = next.x;
      dragged.fy = next.y;
      options.onReheat();
    }
    if (panning) {
      transform = {
        ...transform,
        x: transform.x + event.clientX - panning.x,
        y: transform.y + event.clientY - panning.y,
      };
      panning = { x: event.clientX, y: event.clientY };
      paint();
    }
  };
  const onPointerUp = () => {
    if (dragged) {
      dragged.fx = null;
      dragged.fy = null;
    }
    dragged = undefined;
    panning = undefined;
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.target === options.svg) panning = { x: event.clientX, y: event.clientY };
  };
  options.svg.addEventListener("wheel", onWheel, { passive: false });
  options.svg.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  return {
    setLabelThreshold(value) {
      labelThreshold = value;
      paint();
    },
    startDrag(event, node, circle) {
      event.stopPropagation();
      dragged = node;
      didDrag = false;
      circle.setPointerCapture(event.pointerId);
    },
    consumeDrag() {
      const value = didDrag;
      didDrag = false;
      return value;
    },
    zoom(factor) {
      const space = options.dimensions();
      const next = clampScale(transform.k * factor);
      transform = {
        x: space.x / 2 - ((space.x / 2 - transform.x) * next) / transform.k,
        y: space.y / 2 - ((space.y / 2 - transform.y) * next) / transform.k,
        k: next,
      };
      paint();
    },
    fit(nodes) {
      const xs = nodes.map((node) => node.x ?? 0);
      const ys = nodes.map((node) => node.y ?? 0);
      if (!xs.length || !ys.length) return;
      const width = Math.max(...xs) - Math.min(...xs) || 1;
      const height = Math.max(...ys) - Math.min(...ys) || 1;
      const space = options.dimensions();
      const k = Math.min(
        1.4,
        Math.max(0.25, Math.min(space.x / (width + 120), space.y / (height + 120))),
      );
      transform = {
        x: space.x / 2 - ((Math.min(...xs) + Math.max(...xs)) / 2) * k,
        y: space.y / 2 - ((Math.min(...ys) + Math.max(...ys)) / 2) * k,
        k,
      };
      paint();
    },
    reset() {
      transform = { x: 0, y: 0, k: 1 };
      paint();
    },
    destroy() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      options.svg.removeEventListener("wheel", onWheel);
      options.svg.removeEventListener("pointerdown", onPointerDown);
    },
  };
}
