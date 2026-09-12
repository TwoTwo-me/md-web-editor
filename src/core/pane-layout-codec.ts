import { z } from "zod";
import type { PaneNode, PaneTab } from "./pane-layout";
import { assertNever, groupsOf } from "./pane-layout-tree";

type RawGroup = {
  readonly kind: "group";
  readonly id: string;
  readonly tabs: readonly string[];
  readonly active?: string | undefined;
};
type RawSplit = {
  readonly kind: "split";
  readonly id: string;
  readonly axis: "horizontal" | "vertical";
  readonly ratio: number;
  readonly first: RawNode;
  readonly second: RawNode;
};
type RawNode = RawGroup | RawSplit;
type RawSnapshot = {
  readonly version: 1;
  readonly root: RawNode;
  readonly tabs: readonly PaneTab[];
  readonly activeGroup: string;
};

export type PaneLayoutSnapshot = {
  readonly version: 1;
  readonly root: PaneNode;
  readonly tabs: readonly PaneTab[];
  readonly activeGroup: string;
};
export type RestoredPaneLayout = {
  readonly root: PaneNode | undefined;
  readonly tabs: readonly PaneTab[];
  readonly activeGroup: string;
};

const TabSchema: z.ZodType<PaneTab> = z.discriminatedUnion("kind", [
  z.object({ id: z.string().min(1), kind: z.literal("note"), path: z.string() }).strict(),
  z.object({ id: z.string().min(1), kind: z.literal("graph"), local: z.boolean() }).strict(),
]);
const GroupSchema: z.ZodType<RawGroup> = z
  .object({
    kind: z.literal("group"),
    id: z.string().min(1),
    tabs: z.array(z.string().min(1)),
    active: z.union([z.string().min(1), z.undefined()]),
  })
  .strict();
const NodeSchema: z.ZodType<RawNode> = z.lazy(() =>
  z.union([
    GroupSchema,
    z
      .object({
        kind: z.literal("split"),
        id: z.string().min(1),
        axis: z.union([z.literal("horizontal"), z.literal("vertical")]),
        ratio: z.number().finite(),
        first: NodeSchema,
        second: NodeSchema,
      })
      .strict(),
  ]),
);
const SnapshotSchema: z.ZodType<RawSnapshot> = z
  .object({
    version: z.literal(1),
    root: NodeSchema,
    tabs: z.array(TabSchema),
    activeGroup: z.string().min(1),
  })
  .strict();

export function snapshotOf(
  root: PaneNode,
  tabs: ReadonlyMap<string, PaneTab>,
  activeGroup: string,
): PaneLayoutSnapshot {
  return {
    version: 1,
    root: clone(root),
    tabs: [...tabs.values()].map((tab) => ({ ...tab })),
    activeGroup,
  };
}

export function restoreSnapshot(
  value: unknown,
  allowedPaths: readonly string[],
): RestoredPaneLayout | undefined {
  if (!isJson(value)) return undefined;
  const parsed = SnapshotSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const root = nodeFromRaw(parsed.data.root);
  if (!validTree(root, parsed.data.tabs, parsed.data.activeGroup)) return undefined;
  const tabs = parsed.data.tabs.filter(
    (tab) => tab.kind !== "note" || allowedPaths.includes(tab.path),
  );
  const ids = new Set(tabs.map((tab) => tab.id));
  const pruned = prune(root, ids);
  return { root: pruned, tabs, activeGroup: parsed.data.activeGroup };
}

function clone(node: PaneNode): PaneNode {
  switch (node.kind) {
    case "group":
      return { ...node, tabs: [...node.tabs] };
    case "split":
      return { ...node, first: clone(node.first), second: clone(node.second) };
    default:
      return assertNever(node);
  }
}

function nodeFromRaw(node: RawNode): PaneNode {
  switch (node.kind) {
    case "group":
      return { kind: "group", id: node.id, tabs: [...node.tabs], active: node.active };
    case "split":
      return { ...node, first: nodeFromRaw(node.first), second: nodeFromRaw(node.second) };
    default:
      return assertNever(node);
  }
}

function isJson(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || ancestors.has(value)) return false;
  if (Array.isArray(value))
    return value.every((item) => isJson(item, new Set([...ancestors, value])));
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    return false;
  return Object.values(value).every((item) => isJson(item, new Set([...ancestors, value])));
}

function validTree(root: PaneNode, tabs: readonly PaneTab[], activeGroup: string): boolean {
  const groups = groupsOf(root);
  if (
    groups.length === 0 ||
    groups.length >= 16 ||
    tabs.length >= 128 ||
    !groups.some((group) => group.id === activeGroup)
  )
    return false;
  const nodes = new Set<string>();
  const referenced = new Set<string>();
  const visit = (node: PaneNode): boolean => {
    if (nodes.has(node.id)) return false;
    nodes.add(node.id);
    switch (node.kind) {
      case "group":
        if (node.active !== undefined && !node.tabs.includes(node.active)) return false;
        for (const id of node.tabs) {
          if (referenced.has(id)) return false;
          referenced.add(id);
        }
        return true;
      case "split":
        return visit(node.first) && visit(node.second);
      default:
        return assertNever(node);
    }
  };
  if (!visit(root)) return false;
  const ids = new Set(tabs.map((tab) => tab.id));
  return (
    ids.size === tabs.length &&
    ids.size === referenced.size &&
    [...ids].every((id) => referenced.has(id))
  );
}

function prune(node: PaneNode, ids: ReadonlySet<string>): PaneNode | undefined {
  switch (node.kind) {
    case "group": {
      const tabs = node.tabs.filter((id) => ids.has(id));
      return tabs.length === 0
        ? undefined
        : { ...node, tabs, active: tabs.includes(node.active ?? "") ? node.active : tabs[0] };
    }
    case "split": {
      const first = prune(node.first, ids);
      const second = prune(node.second, ids);
      return !first ? second : !second ? first : { ...node, first, second };
    }
    default:
      return assertNever(node);
  }
}
