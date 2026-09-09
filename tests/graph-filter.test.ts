import { describe, expect, it } from "vitest";
import type { GraphData } from "../src/core/types";
import { filterGraph, groupColor } from "../src/graph/filter";

const data: GraphData = {
  nodes: [
    { id: "notes/a.md", label: "Alpha", kind: "note", tags: ["work"], modified: 3 },
    { id: "notes/b.md", label: "Beta", kind: "note", tags: ["home"], modified: 2 },
    { id: "lost.md", label: "Lost", kind: "missing", tags: [], modified: 0 },
    { id: "#work", label: "#work", kind: "tag", tags: [], modified: 0 },
    { id: "image.png", label: "image.png", kind: "asset", tags: [], modified: 1 },
  ],
  edges: [
    { source: "notes/a.md", target: "notes/b.md" },
    { source: "notes/a.md", target: "#work" },
  ],
};

describe("filterGraph", () => {
  it("keeps the active node plus nodes within the requested local depth", () => {
    // Given: a chain extending past the local radius.
    // When: local depth is one.
    const result = filterGraph(data, { local: true, active: "notes/a.md", depth: 1 });
    // Then: only immediate neighbors remain.
    expect(result.nodes.map((node) => node.id).sort()).toEqual([
      "#work",
      "notes/a.md",
      "notes/b.md",
    ]);
  });

  it("keeps all nodes when the requested depth reaches the graph boundary", () => {
    // Given: a disconnected asset and missing target.
    // When: global mode is selected.
    const result = filterGraph(data, { local: false, active: "notes/a.md", depth: 5 });
    // Then: mode, rather than local depth, controls reachability.
    expect(result.nodes).toHaveLength(5);
  });

  it("hides isolated nodes without retaining hidden edges", () => {
    // Given: a missing node and two isolated nodes.
    // When: missing nodes and orphans are hidden.
    const result = filterGraph(data, {
      local: false,
      active: "notes/a.md",
      depth: 1,
      showMissing: false,
      showOrphans: false,
    });
    // Then: only linked, visible nodes remain and every edge has two endpoints.
    expect(result.nodes.map((node) => node.id).sort()).toEqual([
      "#work",
      "notes/a.md",
      "notes/b.md",
    ]);
    expect(result.edges).toHaveLength(2);
  });
});

describe("groupColor", () => {
  it("uses the first matching group and falls back to the accent token", () => {
    // Given: ordered groups with overlapping queries.
    const groups = [
      { query: "#work", color: "#98ceae" },
      { query: "journal", color: "#e8bc78" },
    ];
    // When: a tagged note and an unmatched node are colored.
    // Then: group priority is stable and the fallback is safe.
    expect(groupColor(data.nodes[0], groups)).toBe("#98ceae");
    expect(groupColor(data.nodes[1], groups)).toBe("var(--accent)");
  });
});

describe("graph queries", () => {
  it("matches AND terms, path and tag clauses, and exclusions", () => {
    const result = filterGraph(data, {
      local: false,
      active: "notes/a.md",
      depth: 1,
      search: "path:notes tag:work -Beta",
    });
    expect(result.nodes.map((node) => node.id)).toEqual(["notes/a.md"]);
  });
});
