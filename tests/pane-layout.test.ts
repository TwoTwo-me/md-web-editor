import { describe, expect, it } from "vitest";
import type { PaneGroup, PaneNode, PaneSplit, PaneTab } from "../src/core/pane-layout";
import { PaneLayout } from "../src/core/pane-layout";

function note(id: string, path = `${id}.md`): PaneTab {
  return { id, kind: "note", path };
}

function group(layout: PaneLayout, id: string): PaneGroup {
  const value = layout.group(id);
  if (!value) throw new Error(`Missing group ${id}`);
  return value;
}

function split(node: PaneNode): PaneSplit {
  if (node.kind !== "split") throw new Error("Expected split");
  return node;
}

describe("PaneLayout", () => {
  it("adds, selects, and focuses tabs in depth-first groups", () => {
    const layout = new PaneLayout();
    const first = layout.activeGroup;
    layout.add(note("a"));
    layout.add(note("b"));
    layout.move("b", { group: first, position: "right" });
    const second = layout.groups()[1]?.id;
    if (!second) throw new Error("Missing second group");

    layout.add({ id: "graph", kind: "graph", local: true }, second);
    layout.focus(first);
    layout.select("graph");

    expect(layout.groups().map((value) => value.id)).toEqual([first, second]);
    expect(group(layout, first).active).toBe("a");
    expect(layout.activeGroup).toBe(second);
    expect(layout.activeTab()).toEqual({ id: "graph", kind: "graph", local: true });
  });

  it("creates nested edge splits and reorders within a group after removal", () => {
    const layout = new PaneLayout();
    const root = layout.activeGroup;
    layout.add(note("a"));
    layout.add(note("b"));
    layout.add(note("c"));
    layout.move("b", { group: root, position: "right" });
    layout.move("a", { group: root, position: "center", index: 2 });
    const right = layout.groups()[1]?.id;
    if (!right) throw new Error("Missing right group");
    layout.move("c", { group: right, position: "bottom" });
    const bottom = layout.groups()[2]?.id;
    if (!bottom) throw new Error("Missing bottom group");

    expect(group(layout, root).tabs).toEqual(["a"]);
    expect(group(layout, bottom).tabs).toEqual(["c"]);
    expect(split(layout.root).second.kind).toBe("split");
    expect(layout.groups()).toHaveLength(3);
  });

  it("collapses empty groups and selects the adjacent tab when closing the active tab", () => {
    const layout = new PaneLayout();
    const first = layout.activeGroup;
    layout.add(note("a"));
    layout.add(note("b"));
    layout.move("b", { group: first, position: "right" });
    const second = layout.groups()[1]?.id;
    if (!second) throw new Error("Missing second group");

    layout.close("a");
    layout.close("b");

    expect(layout.root.kind).toBe("group");
    expect(layout.groups()).toHaveLength(1);
    expect(layout.activeTab()).toBeUndefined();
    expect(layout.tabs.size).toBe(0);
  });

  it("collapses a source group when moving its sole tab into its sibling", () => {
    const layout = new PaneLayout();
    const first = layout.activeGroup;
    layout.add(note("a"));
    layout.add(note("b"));
    layout.move("b", { group: first, position: "right" });
    const second = layout.groups()[1]?.id;
    if (!second) throw new Error("Missing second group");

    layout.move("a", { group: second, position: "center" });

    expect(layout.groups()).toHaveLength(1);
    expect(group(layout, second).tabs).toEqual(["b", "a"]);
    expect(layout.activeGroup).toBe(second);
  });

  it("clamps finite split ratios and ignores invalid split ids or values", () => {
    const layout = new PaneLayout();
    const root = layout.activeGroup;
    layout.add(note("a"));
    layout.add(note("b"));
    layout.move("b", { group: root, position: "right" });
    const rootSplit = split(layout.root);

    layout.setRatio(rootSplit.id, 2);
    layout.setRatio(rootSplit.id, Number.NaN);
    layout.setRatio("missing", 0.2);

    expect(split(layout.root).ratio).toBe(0.85);
  });

  it("keeps a sole tab in place when dropped against its own edge", () => {
    const layout = new PaneLayout();
    layout.add(note("only"));
    const before = layout.snapshot();

    layout.move("only", { group: layout.activeGroup, position: "left" });

    expect(layout.snapshot()).toEqual(before);
  });

  it("appends a same-group tab when center drop has no explicit index", () => {
    const layout = new PaneLayout();
    layout.add(note("a"));
    layout.add(note("b"));
    layout.add(note("c"));

    layout.move("a", { group: layout.activeGroup, position: "center" });

    expect(layout.group()?.tabs).toEqual(["b", "c", "a"]);
  });

  it("resets to one empty group", () => {
    const layout = new PaneLayout();
    layout.add(note("a"));

    layout.reset();

    expect(layout.groups()).toHaveLength(1);
    expect(layout.group()?.tabs).toEqual([]);
    expect(layout.tabs.size).toBe(0);
  });

  it("restores valid snapshots while removing unavailable notes and collapsing their groups", () => {
    const layout = new PaneLayout();
    const root = layout.activeGroup;
    layout.add(note("keep", "keep.md"));
    layout.add(note("gone", "gone.md"));
    layout.move("gone", { group: root, position: "right" });
    const snapshot = layout.snapshot();
    const restored = new PaneLayout();

    expect(restored.restore(snapshot, ["keep.md"])).toBe(true);
    expect(restored.groups()).toHaveLength(1);
    expect(restored.activeTab()).toEqual(note("keep", "keep.md"));
    expect([...restored.tabs.keys()]).toEqual(["keep"]);
  });

  it("rejects malformed snapshots without changing its current layout", () => {
    const layout = new PaneLayout();
    layout.add(note("safe"));
    const before = layout.snapshot();
    const malformed = {
      version: 1,
      root: { kind: "group", id: "g", tabs: ["missing"], active: "missing" },
      tabs: [],
      activeGroup: "g",
    };

    expect(layout.restore(malformed, [])).toBe(false);
    expect(layout.snapshot()).toEqual(before);
  });

  it("rejects duplicate node and tab ids in snapshots", () => {
    const layout = new PaneLayout();
    const duplicate = {
      version: 1,
      root: {
        kind: "split",
        id: "same",
        axis: "horizontal",
        ratio: 0.5,
        first: { kind: "group", id: "same", tabs: ["a"], active: "a" },
        second: { kind: "group", id: "other", tabs: ["a"], active: "a" },
      },
      tabs: [note("a")],
      activeGroup: "same",
    };

    expect(layout.restore(duplicate, ["a.md"])).toBe(false);
  });
});
