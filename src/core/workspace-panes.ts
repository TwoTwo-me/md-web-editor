import { createGraph, type GraphView } from "../graph/graph";
import { element } from "../ui/dom";
import { createPaneSurface } from "../ui/pane-surface";
import { workspacePaneMenu } from "../ui/workspace-pane-menu";
import { PaneLayout, type PaneTab } from "./pane-layout";
import { closePane, duplicatePane, openPane, restorePanes } from "./pane-operations";
import { PanePersistence } from "./pane-persistence";
import type { EditorMode } from "./types";
import type { Workspace } from "./workspace";
import { followGraphNode } from "./workspace-operations";

export type PaneDrop = {
  readonly group: string;
  readonly position: "center" | "left" | "right" | "top" | "bottom";
  readonly index?: number;
};

export class WorkspacePanes {
  readonly layout = new PaneLayout();
  readonly graphs = new Map<string, { readonly host: HTMLElement; readonly view: GraphView }>();
  readonly requests = new Map<string, symbol>();
  readonly persistence: PanePersistence;
  restoring = false;
  private lastNoteGroup = "";
  private readonly surface;

  constructor(readonly app: Workspace) {
    this.persistence = new PanePersistence((cause) => app.report(cause));
    this.surface = createPaneSurface({
      parent: app.shell.panes,
      layout: this.layout,
      content: (tab) => this.content(tab),
      mode: (tab) => app.sessions?.views.get(tab.id)?.mode ?? "live",
      actions: {
        select: (id) => this.select(id),
        focus: (id) => this.focus(id),
        close: (id) => app.run(() => this.close(id)),
        create: (group) => {
          this.focus(group);
          app.createNote();
        },
        menu: (context) => workspacePaneMenu(this, context),
        mode: (id, mode) => this.mode(id, mode),
        graph: (group) => this.showGraph(false, group),
        move: (id, target) => this.move(id, target),
        resize: (id, ratio) => {
          this.layout.setRatio(id, ratio);
          this.changed();
        },
        toggleExplorer: () => app.shell.shell.classList.toggle("hide-explorer"),
        toggleInspector: () =>
          app.shell.shell.classList.toggle(
            innerWidth <= 1100 ? "show-inspector" : "hide-inspector",
          ),
      },
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.persistence.flush();
    });
  }
  content(tab: PaneTab): HTMLElement | undefined {
    if (tab.kind === "note") return this.app.sessions?.views.get(tab.id)?.host;
    const existing = this.graphs.get(tab.id);
    if (existing) return existing.host;
    const host = element("div", "graph-host");
    const view = createGraph({
      parent: host,
      data: this.app.graphData(),
      active: this.app.sessions?.active ?? "",
      local: tab.local,
      onOpen: (id) => this.app.run(() => this.followGraph(tab.id, id)),
    });
    this.graphs.set(tab.id, { host, view });
    return host;
  }
  label(id: string): string {
    const tab = this.layout.tabs.get(id);
    return tab?.kind === "note"
      ? (tab.path.split("/").at(-1) ?? tab.path)
      : tab?.kind === "graph" && tab.local
        ? "로컬 그래프"
        : "그래프 뷰";
  }
  open(path: string, group = this.layout.activeGroup) {
    return openPane(this, path, group);
  }
  close(id = this.layout.group()?.active ?? "") {
    return closePane(this, id);
  }
  duplicate(id: string, position: "right" | "bottom") {
    return duplicatePane(this, id, position);
  }
  restore() {
    return restorePanes(this);
  }

  select(id: string, focusEditor = true) {
    const tab = this.layout.tabs.get(id);
    if (!tab) return;
    this.layout.select(id);
    if (tab.kind === "note") {
      const previous = this.app.sessions?.active;
      this.app.sessions?.activateView(id);
      this.lastNoteGroup = this.layout.activeGroup;
      if (previous !== tab.path) this.updateGraphs();
    }
    this.changed();
    if (focusEditor && tab.kind === "note") this.app.sessions?.views.get(id)?.editor.focus();
    else if (focusEditor)
      this.app.shell.panes
        .querySelector<HTMLButtonElement>(`[data-pane-tab="${CSS.escape(id)}"] [role="tab"]`)
        ?.focus();
  }
  focus(group: string) {
    if (this.layout.activeGroup === group) return;
    this.layout.focus(group);
    const active = this.layout.group()?.active;
    if (active) this.select(active, false);
    else this.changed();
  }
  onEditorFocus(id: string) {
    if (this.layout.group()?.active !== id) this.select(id, false);
  }
  mode(id: string, mode: EditorMode) {
    const tab = this.layout.tabs.get(id);
    if (tab?.kind !== "note") return;
    this.layout.select(id);
    this.app.sessions?.activateView(id);
    this.app.sessions?.setMode(mode);
    this.changed();
  }
  showGraph(local = false, group = this.layout.activeGroup, duplicate = false) {
    if (!this.app.vault) {
      this.app.notice("폴더 또는 예제 공간을 먼저 여세요.");
      return;
    }
    const existing =
      !duplicate &&
      this.layout.group(group)?.tabs.find((id) => {
        const tab = this.layout.tabs.get(id);
        return tab?.kind === "graph" && tab.local === local;
      });
    const id = existing || crypto.randomUUID();
    if (!existing) this.layout.add({ id, kind: "graph", local }, group);
    this.select(id);
    return id;
  }
  graphRight(group = this.layout.activeGroup) {
    const id = this.showGraph(false, group, true);
    if (id) this.move(id, { group, position: "right" });
  }
  move(id: string, target: PaneDrop) {
    this.layout.move(id, target);
    this.select(id);
  }
  async closeGroup(group: string) {
    const ids = [...(this.layout.group(group)?.tabs ?? [])];
    if (!(await this.app.canLeave())) return;
    for (const id of ids) if (!(await this.close(id))) return;
  }
  merge(group = this.layout.activeGroup) {
    for (const item of [...this.layout.groups()])
      if (item.id !== group)
        for (const id of item.tabs) this.layout.move(id, { group, position: "center" });
    this.changed();
  }
  next(direction: number) {
    const group = this.layout.group();
    if (!group?.tabs.length) return;
    const index = group.tabs.indexOf(group.active ?? "");
    const id = group.tabs[(index + direction + group.tabs.length) % group.tabs.length];
    if (id) this.select(id);
  }
  nextGroup() {
    const groups = this.layout.groups();
    const index = groups.findIndex((item) => item.id === this.layout.activeGroup);
    const group = groups[(index + 1) % groups.length];
    if (group?.active) this.select(group.active);
  }
  updateGraphs() {
    if (!this.graphs.size) return;
    const data = this.app.graphData();
    for (const graph of this.graphs.values())
      graph.view.update(data, this.app.sessions?.active ?? "");
  }
  private async followGraph(tabId: string, node: string) {
    const groups = this.layout.groups();
    const graphGroup = groups.find((group) => group.tabs.includes(tabId));
    const notes = groups.filter(
      (group) =>
        group.id !== graphGroup?.id &&
        group.tabs.some((id) => this.layout.tabs.get(id)?.kind === "note"),
    );
    const target = notes.find((group) => group.id === this.lastNoteGroup) ?? notes[0] ?? graphGroup;
    if (target) this.focus(target.id);
    await followGraphNode(this.app, node);
  }
  changed() {
    if (this.restoring) return;
    if (this.app.vault) this.persistence.schedule(this.app.vault.id, this.layout);
    this.app.render();
  }
  render() {
    this.app.shell.panes.hidden = !this.app.vault && !this.layout.tabs.size;
    if (this.app.vault) this.app.shell.welcome.hidden = true;
    this.surface.render();
  }
  reset() {
    this.persistence.flush();
    this.restoring = false;
    this.requests.clear();
    for (const graph of this.graphs.values()) graph.view.destroy();
    this.graphs.clear();
    this.layout.reset();
    this.lastNoteGroup = "";
    this.surface.render();
  }
}
