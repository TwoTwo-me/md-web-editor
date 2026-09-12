/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GraphData } from "../src/core/types";
import { createGraph } from "../src/graph/graph";
import { createGraphScene } from "../src/graph/scene";
import { defaultGraphSettings } from "../src/graph/settings";

const data: GraphData = {
  nodes: [
    { id: "a.md", label: "Alpha", kind: "note", tags: ["work"], modified: 1 },
    { id: "b.md", label: "Beta", kind: "note", tags: [], modified: 2 },
  ],
  edges: [{ source: "a.md", target: "b.md" }],
};

class TestResizeObserver implements ResizeObserver {
  static readonly observers: TestResizeObserver[] = [];
  private readonly targets = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.observers.push(this);
  }

  observe(target: Element): void {
    this.targets.add(target);
  }
  unobserve(target: Element): void {
    this.targets.delete(target);
  }
  disconnect(): void {}

  static resize(target: Element): void {
    for (const observer of TestResizeObserver.observers) {
      if (observer.targets.has(target)) observer.callback([], observer);
    }
  }

  static reset(): void {
    TestResizeObserver.observers.length = 0;
  }
}

Object.defineProperty(globalThis, "ResizeObserver", { value: TestResizeObserver });
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: () => ({ matches: false }),
});

afterEach(() => {
  document.body.replaceChildren();
  TestResizeObserver.reset();
  vi.restoreAllMocks();
});

describe("createGraph", () => {
  it("renders keyboard navigation and releases the graph on destroy", () => {
    // Given: a graph mounted in a panel.
    const parent = document.createElement("div");
    document.body.append(parent);
    const opened: string[] = [];
    const graph = createGraph({
      parent,
      data,
      active: "a.md",
      local: false,
      onOpen: (id) => opened.push(id),
    });
    // When: a keyboard alternative row is selected, then the graph is destroyed.
    parent.querySelector<HTMLButtonElement>(".graph-list-item")?.click();
    graph.destroy();
    // Then: navigation was exposed without the spatial canvas and cleanup removed the mount.
    expect(opened).toEqual(["a.md"]);
    expect(parent.children).toHaveLength(0);
  });

  it("synchronizes reset controls after settings and search changes", () => {
    const parent = document.createElement("div");
    const graph = createGraph({ parent, data, active: "a.md", local: false, onOpen: () => {} });
    parent.querySelector<HTMLButtonElement>(".graph-toolbar .button:last-child")?.click();
    const search = parent.querySelector<HTMLInputElement>('input[type="search"]');
    const tags = parent.querySelector<HTMLInputElement>('[data-setting="showTags"]');
    const scale = parent.querySelector<HTMLInputElement>('[data-setting="nodeScale"]');
    if (!search || !tags || !scale) throw new Error("expected graph controls");
    search.value = "Alpha";
    search.dispatchEvent(new Event("input"));
    tags.checked = false;
    tags.dispatchEvent(new Event("change"));
    scale.value = "1.7";
    scale.dispatchEvent(new Event("input"));
    parent.querySelectorAll<HTMLButtonElement>(".graph-toolbar .button").forEach((button) => {
      if (button.textContent === "초기화") button.click();
    });
    expect(search.value).toBe("");
    expect(tags.checked).toBe(true);
    expect(scale.value).toBe("1");
    graph.destroy();
  });

  it("reveals modification history in order and stops its timer", () => {
    vi.useFakeTimers();
    const parent = document.createElement("div");
    const graph = createGraph({ parent, data, active: "a.md", local: false, onOpen: () => {} });
    const history = [...parent.querySelectorAll<HTMLButtonElement>(".graph-timeline .button")][0];
    history?.click();
    vi.advanceTimersByTime(500);
    const timeline = parent.querySelector<HTMLInputElement>(".graph-timeline input[type=range]");
    expect(timeline?.value).toBe("1");
    expect(history?.textContent).toBe("기록 재생");
    graph.destroy();
    vi.useRealTimers();
  });

  it("does not render a pending search after destroy", () => {
    // Given: a graph with a scheduled search filter.
    vi.useFakeTimers();
    const parent = document.createElement("div");
    const graph = createGraph({ parent, data, active: "a.md", local: false, onOpen: () => {} });
    const root = parent.firstElementChild;
    const search = parent.querySelector<HTMLInputElement>('input[type="search"]');
    if (!root || !search) throw new Error("expected graph view and search control");
    search.value = "no matching note";
    search.dispatchEvent(new Event("input"));
    // When: the graph is destroyed before the debounce expires.
    graph.destroy();
    vi.advanceTimersByTime(120);
    vi.useRealTimers();
    // Then: the detached scene retains its rendered nodes instead of being filtered and rebuilt.
    expect(root.querySelectorAll(".graph-node")).toHaveLength(data.nodes.length);
  });

  it("places initial nodes when reduced motion starts paused", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: true }),
    });
    const parent = document.createElement("div");
    const graph = createGraph({ parent, data, active: "a.md", local: false, onOpen: () => {} });
    expect(parent.querySelector<SVGGElement>(".graph-node")?.getAttribute("transform")).toContain(
      "translate(",
    );
    graph.destroy();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: false }),
    });
  });

  it("recenters a paused graph after its detached stage receives its first size", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const size = this.classList.contains("graph-stage") && this.isConnected ? 640 : 0;
      return new DOMRect(0, 0, size, size ? 480 : 0);
    });
    const stage = document.createElement("div");
    stage.className = "graph-stage";
    const scene = createGraphScene({ stage, onOpen: () => {}, onReset: () => {} });

    scene.render({ data, active: "a.md", settings: defaultGraphSettings, paused: true });
    document.body.append(stage);
    TestResizeObserver.resize(stage);

    const centerOfNodes = () => {
      const coordinates = [...stage.querySelectorAll<SVGGElement>(".graph-node")].map((node) => {
        const transform = node.getAttribute("transform") ?? "";
        const match = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform);
        if (!match) throw new Error("expected a positioned graph node");
        return { x: Number(match[1]), y: Number(match[2]) };
      });
      return coordinates.reduce(
        (sum, point) => ({
          x: sum.x + point.x / coordinates.length,
          y: sum.y + point.y / coordinates.length,
        }),
        { x: 0, y: 0 },
      );
    };
    const center = centerOfNodes();

    expect(center.x).toBeCloseTo(320, 0);
    expect(center.y).toBeCloseTo(240, 0);
    stage.remove();
    TestResizeObserver.resize(stage);
    expect(centerOfNodes()).toEqual(center);
    scene.destroy();
  });

  it("gives simultaneously mounted graph views separate arrow markers", () => {
    const firstParent = document.createElement("div");
    const secondParent = document.createElement("div");
    document.body.append(firstParent, secondParent);
    const first = createGraph({
      parent: firstParent,
      data,
      active: "a.md",
      local: false,
      onOpen: () => {},
    });
    const second = createGraph({
      parent: secondParent,
      data,
      active: "a.md",
      local: false,
      onOpen: () => {},
    });
    const firstMarker = firstParent.querySelector<SVGMarkerElement>("marker");
    const secondMarker = secondParent.querySelector<SVGMarkerElement>("marker");

    expect(firstMarker?.id).not.toBe(secondMarker?.id);
    expect(firstParent.querySelector("line")?.getAttribute("marker-end")).toBe(
      `url(#${firstMarker?.id})`,
    );
    expect(secondParent.querySelector("line")?.getAttribute("marker-end")).toBe(
      `url(#${secondMarker?.id})`,
    );
    first.destroy();
    second.destroy();
  });
});
