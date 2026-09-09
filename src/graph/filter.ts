import type { GraphData, GraphEdge, GraphNode } from "../core/types";

export type GraphFilter = {
  readonly local: boolean;
  readonly active: string;
  readonly depth: number;
  readonly search?: string;
  readonly showTags?: boolean;
  readonly showAssets?: boolean;
  readonly showMissing?: boolean;
  readonly showOrphans?: boolean;
  readonly timeline?: number;
};
export type ColorGroup = { readonly query: string; readonly color: string };

function includesNode(node: GraphNode, query: string): boolean {
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => {
      const excluded = term.startsWith("-");
      const value = (excluded ? term.slice(1) : term).toLocaleLowerCase();
      const matches = value.startsWith("path:")
        ? node.id.toLocaleLowerCase().includes(value.slice(5))
        : value.startsWith("tag:")
          ? node.tags.some((tag) => tag.toLocaleLowerCase() === value.slice(4).replace(/^#/, ""))
          : value.startsWith("#")
            ? node.tags.some((tag) => tag.toLocaleLowerCase() === value.slice(1))
            : `${node.id} ${node.label} ${node.tags.join(" ")}`.toLocaleLowerCase().includes(value);
      return excluded ? !matches : matches;
    });
}

function connectedIds(data: GraphData, active: string, depth: number): ReadonlySet<string> {
  const adjacent = new Map<string, Set<string>>();
  for (const { source, target } of data.edges) {
    const sourceLinks = adjacent.get(source) ?? new Set<string>();
    sourceLinks.add(target);
    adjacent.set(source, sourceLinks);
    const targetLinks = adjacent.get(target) ?? new Set<string>();
    targetLinks.add(source);
    adjacent.set(target, targetLinks);
  }
  const visited = new Set([active]);
  let frontier = new Set([active]);
  for (let level = 0; level < depth; level += 1) {
    const next = new Set<string>();
    for (const id of frontier)
      for (const neighbor of adjacent.get(id) ?? []) {
        if (!visited.has(neighbor)) next.add(neighbor);
      }
    for (const id of next) visited.add(id);
    frontier = next;
  }
  return visited;
}

function isShown(node: GraphNode, filter: GraphFilter, ids: ReadonlySet<string>): boolean {
  if (filter.local && !ids.has(node.id)) return false;
  if (filter.showTags === false && node.kind === "tag") return false;
  if (filter.showAssets === false && node.kind === "asset") return false;
  if (filter.showMissing === false && node.kind === "missing") return false;
  if (filter.timeline !== undefined && node.modified > filter.timeline) return false;
  return !filter.search || includesNode(node, filter.search);
}

export function filterGraph(data: GraphData, filter: GraphFilter): GraphData {
  const ids = connectedIds(data, filter.active, Math.min(5, Math.max(1, filter.depth)));
  let nodes = data.nodes.filter((node) => isShown(node, filter, ids));
  const visible = new Set(nodes.map((node) => node.id));
  let edges: readonly GraphEdge[] = data.edges.filter(
    (edge) => visible.has(edge.source) && visible.has(edge.target),
  );
  if (filter.showOrphans === false) {
    const linked = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
    nodes = nodes.filter((node) => linked.has(node.id));
    edges = edges.filter((edge) => linked.has(edge.source) && linked.has(edge.target));
  }
  return { nodes, edges };
}

export function groupColor(node: GraphNode | undefined, groups: readonly ColorGroup[]): string {
  if (!node) return "var(--accent)";
  const match = groups.find((group) => includesNode(node, group.query));
  return match?.color ?? "var(--accent)";
}
