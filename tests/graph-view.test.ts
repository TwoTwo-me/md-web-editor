/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GraphData } from "../src/core/types";
import { createGraph } from "../src/graph/graph";

const data: GraphData = {
  nodes: [
    { id: "a.md", label: "Alpha", kind: "note", tags: ["work"], modified: 1 },
    { id: "b.md", label: "Beta", kind: "note", tags: [], modified: 2 },
  ],
  edges: [{ source: "a.md", target: "b.md" }],
};

class TestResizeObserver {
  observe(): void {}
  disconnect(): void {}
}

Object.defineProperty(globalThis, "ResizeObserver", { value: TestResizeObserver });
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: () => ({ matches: false }),
});

afterEach(() => document.body.replaceChildren());

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
});
