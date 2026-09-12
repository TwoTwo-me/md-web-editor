import type { PaneGroup, PaneNode, PaneSplit } from "./pane-layout";

export function assertNever(value: never): never {
  throw new Error(`Unexpected pane node: ${JSON.stringify(value)}`);
}

export function groupsOf(node: PaneNode): readonly PaneGroup[] {
  const groups: PaneGroup[] = [];
  const walk = (current: PaneNode): void => {
    switch (current.kind) {
      case "group":
        groups.push(current);
        return;
      case "split":
        walk(current.first);
        walk(current.second);
        return;
      default:
        assertNever(current);
    }
  };
  walk(node);
  return groups;
}

export function replaceNode(node: PaneNode, id: string, next: PaneNode): PaneNode {
  if (node.id === id) return next;
  switch (node.kind) {
    case "group":
      return node;
    case "split":
      return {
        ...node,
        first: replaceNode(node.first, id, next),
        second: replaceNode(node.second, id, next),
      };
    default:
      return assertNever(node);
  }
}

export function normalizeNode(node: PaneNode): PaneNode | undefined {
  switch (node.kind) {
    case "group":
      return node.tabs.length === 0 ? undefined : node;
    case "split": {
      const first = normalizeNode(node.first);
      const second = normalizeNode(node.second);
      if (!first) return second;
      if (!second) return first;
      return { ...node, first, second };
    }
    default:
      return assertNever(node);
  }
}

export function findSplit(node: PaneNode, id: string): PaneSplit | undefined {
  switch (node.kind) {
    case "group":
      return undefined;
    case "split":
      return node.id === id ? node : (findSplit(node.first, id) ?? findSplit(node.second, id));
    default:
      return assertNever(node);
  }
}

export function nodeIdExists(node: PaneNode | undefined, id: string): boolean {
  if (!node) return false;
  switch (node.kind) {
    case "group":
      return node.id === id;
    case "split":
      return node.id === id || nodeIdExists(node.first, id) || nodeIdExists(node.second, id);
    default:
      return assertNever(node);
  }
}
