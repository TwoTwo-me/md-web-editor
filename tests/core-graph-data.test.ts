import { describe, expect, it } from "vitest";
import { buildGraph } from "../src/core/graph-data";
import type { Note, VaultEntry } from "../src/core/types";

describe("graph link resolution", () => {
  it("keeps missing paths canonical relative to their source", () => {
    const notes: Note[] = [{ path: "folder/source.md", content: "[[missing]]" }];
    const entries: VaultEntry[] = [{ path: notes[0]?.path ?? "", kind: "note", modified: 1 }];
    const graph = buildGraph(notes, entries);
    expect(graph.nodes.find((node) => node.kind === "missing")?.id).toBe("folder/missing.md");
    expect(graph.edges).toEqual([{ source: "folder/source.md", target: "folder/missing.md" }]);
  });
  it("retains ambiguous links without inventing resolved connections", () => {
    const notes: Note[] = [
      { path: "source.md", content: "[[same]]" },
      { path: "a/same.md", content: "" },
      { path: "b/same.md", content: "" },
    ];
    const entries: VaultEntry[] = notes.map((note) => ({
      path: note.path,
      kind: "note",
      modified: 1,
    }));
    const graph = buildGraph(notes, entries);
    const unresolved = graph.nodes.find((node) => node.candidates);
    expect(unresolved?.candidates).toEqual(["a/same.md", "b/same.md"]);
    expect(graph.edges).toEqual([{ source: "source.md", target: unresolved?.id }]);
  });
});
