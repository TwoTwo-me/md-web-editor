import { indexDocument, resolveLink } from "../editor/markdown";
import type { GraphData, GraphEdge, GraphNode, Note, VaultEntry } from "./types";
export function buildGraph(notes: readonly Note[], entries: readonly VaultEntry[]): GraphData {
  const paths = entries.map((e) => e.path);
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  for (const note of notes) {
    const index = indexDocument(note.content);
    nodes.set(note.path, {
      id: note.path,
      label: note.path.replace(/^.*\//, "").replace(/\.markdown$|\.md$/i, ""),
      kind: "note",
      tags: index.tags,
      modified: entries.find((e) => e.path === note.path)?.modified ?? 0,
    });
  }
  for (const note of notes) {
    const index = indexDocument(note.content);
    for (const link of index.links) {
      const resolved = resolveLink(note.path, link.target, paths, link.kind);
      if (resolved.kind !== "note" && resolved.kind !== "missing") continue;
      const path = resolved.path;
      const entry = entries.find((e) => e.path === path);
      if (!nodes.has(path))
        nodes.set(path, {
          id: path,
          label: path.replace(/^.*\//, ""),
          kind: entry?.kind === "asset" ? "asset" : "missing",
          tags: [],
          modified: entry?.modified ?? 0,
        });
      if (path !== note.path && !edges.some((e) => e.source === note.path && e.target === path))
        edges.push({ source: note.path, target: path });
    }
    for (const tag of index.tags) {
      const id = `#${tag.replace(/^#/, "")}`;
      nodes.set(id, { id, label: id, kind: "tag", tags: [tag], modified: 0 });
      edges.push({ source: note.path, target: id });
    }
  }
  return { nodes: [...nodes.values()], edges };
}
