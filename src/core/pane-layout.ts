import { restoreSnapshot, snapshotOf } from "./pane-layout-codec";
import { findSplit, groupsOf, nodeIdExists, normalizeNode, replaceNode } from "./pane-layout-tree";

export type PaneTab =
  | { readonly id: string; readonly kind: "note"; readonly path: string }
  | { readonly id: string; readonly kind: "graph"; readonly local: boolean };

export type PaneGroup = {
  readonly kind: "group";
  readonly id: string;
  readonly tabs: readonly string[];
  readonly active: string | undefined;
};

export type PaneSplit = {
  readonly kind: "split";
  readonly id: string;
  readonly axis: "horizontal" | "vertical";
  readonly ratio: number;
  readonly first: PaneNode;
  readonly second: PaneNode;
};

export type PaneNode = PaneGroup | PaneSplit;

type DropTarget = {
  readonly group: string;
  readonly position: "center" | "left" | "right" | "top" | "bottom";
  readonly index?: number;
};

export class PaneLayout {
  root: PaneNode;
  activeGroup: string;
  readonly tabs = new Map<string, PaneTab>();
  private sequence = 0;

  constructor() {
    const root = this.emptyGroup();
    this.root = root;
    this.activeGroup = root.id;
  }

  groups(): readonly PaneGroup[] {
    return groupsOf(this.root);
  }
  group(id = this.activeGroup): PaneGroup | undefined {
    return this.groups().find((group) => group.id === id);
  }
  activeTab(): PaneTab | undefined {
    const id = this.group()?.active;
    return id ? this.tabs.get(id) : undefined;
  }

  add(tab: PaneTab, groupId = this.activeGroup): void {
    const group = this.group(groupId);
    if (!group || this.tabs.has(tab.id)) return;
    this.tabs.set(tab.id, tab);
    this.root = replaceNode(this.root, group.id, {
      ...group,
      tabs: [...group.tabs, tab.id],
      active: tab.id,
    });
    this.activeGroup = group.id;
  }

  select(tabId: string): void {
    const group = this.groups().find((group) => group.tabs.includes(tabId));
    if (!group) return;
    this.root = replaceNode(this.root, group.id, { ...group, active: tabId });
    this.activeGroup = group.id;
  }

  focus(groupId: string): void {
    if (this.group(groupId)) this.activeGroup = groupId;
  }

  move(tabId: string, target: DropTarget): void {
    const source = this.groups().find((group) => group.tabs.includes(tabId));
    const destination = this.group(target.group);
    if (!source || !destination || !this.tabs.has(tabId)) return;
    if (target.position !== "center" && source.id === destination.id && source.tabs.length === 1)
      return;
    const sourceIndex = source.tabs.indexOf(tabId);
    const remaining = source.tabs.filter((id) => id !== tabId);
    this.root = replaceNode(this.root, source.id, {
      ...source,
      tabs: remaining,
      active:
        source.active === tabId
          ? remaining[Math.min(sourceIndex, remaining.length - 1)]
          : source.active,
    });
    const targetGroup = this.group(destination.id);
    if (!targetGroup) return;
    if (target.position === "center") {
      const index = target.index ?? targetGroup.tabs.length;
      const at = Math.max(
        0,
        Math.min(
          target.index !== undefined && source.id === targetGroup.id && index > sourceIndex
            ? index - 1
            : index,
          targetGroup.tabs.length,
        ),
      );
      const tabs = [...targetGroup.tabs];
      tabs.splice(at, 0, tabId);
      this.root = this.ensureRoot(
        normalizeNode(
          replaceNode(this.root, targetGroup.id, { ...targetGroup, tabs, active: tabId }),
        ),
      );
      this.activeGroup = targetGroup.id;
      return;
    }
    const added = this.emptyGroup(tabId);
    const axis =
      target.position === "left" || target.position === "right" ? "horizontal" : "vertical";
    const before = target.position === "left" || target.position === "top";
    const split: PaneSplit = {
      kind: "split",
      id: this.nextId("split"),
      axis,
      ratio: 0.5,
      first: before ? added : targetGroup,
      second: before ? targetGroup : added,
    };
    this.root = this.ensureRoot(normalizeNode(replaceNode(this.root, targetGroup.id, split)));
    this.activeGroup = added.id;
  }

  close(tabId: string): void {
    const group = this.groups().find((group) => group.tabs.includes(tabId));
    if (!group) return;
    const index = group.tabs.indexOf(tabId);
    const tabs = group.tabs.filter((id) => id !== tabId);
    this.tabs.delete(tabId);
    this.root = this.ensureRoot(
      normalizeNode(
        replaceNode(this.root, group.id, {
          ...group,
          tabs,
          active: group.active === tabId ? tabs[Math.min(index, tabs.length - 1)] : group.active,
        }),
      ),
    );
    if (!this.group(this.activeGroup)) this.activeGroup = this.groups()[0]?.id ?? this.activeGroup;
  }

  setRatio(splitId: string, ratio: number): void {
    if (!Number.isFinite(ratio)) return;
    const split = findSplit(this.root, splitId);
    if (split)
      this.root = replaceNode(this.root, split.id, {
        ...split,
        ratio: Math.max(0.15, Math.min(ratio, 0.85)),
      });
  }

  reset(): void {
    this.tabs.clear();
    this.root = this.emptyGroup();
    this.activeGroup = this.root.id;
  }
  snapshot(): {
    readonly version: 1;
    readonly root: PaneNode;
    readonly tabs: readonly PaneTab[];
    readonly activeGroup: string;
  } {
    return snapshotOf(this.root, this.tabs, this.activeGroup);
  }

  restore(value: unknown, allowedPaths: readonly string[]): boolean {
    const restored = restoreSnapshot(value, allowedPaths);
    if (!restored) return false;
    this.tabs.clear();
    for (const tab of restored.tabs) this.tabs.set(tab.id, tab);
    this.root = this.ensureRoot(restored.root);
    this.activeGroup =
      this.group(restored.activeGroup)?.id ?? this.groups()[0]?.id ?? this.activeGroup;
    return true;
  }

  private emptyGroup(tab?: string): PaneGroup {
    return { kind: "group", id: this.nextId("group"), tabs: tab ? [tab] : [], active: tab };
  }
  private nextId(kind: "group" | "split"): string {
    let id: string;
    do {
      this.sequence += 1;
      id = `pane-${kind}-${this.sequence}`;
    } while (nodeIdExists(this.root, id));
    return id;
  }
  private ensureRoot(root: PaneNode | undefined): PaneNode {
    return root ?? this.emptyGroup();
  }
}
