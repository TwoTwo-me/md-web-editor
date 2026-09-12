import type { PaneGroup, PaneLayout, PaneTab } from "../core/pane-layout";
import { iconButton } from "./dom";
import type { createPaneDrag } from "./pane-drag";
import type { PaneSurfaceActions, PaneSurfaceOptions } from "./pane-surface-types";

export type PaneGroupDom = {
  readonly node: HTMLElement;
  readonly tabs: HTMLElement;
  readonly toolbar: HTMLElement;
  readonly content: HTMLElement;
  readonly empty: HTMLElement;
  signature: string;
};
export type PaneTabDom = {
  readonly node: HTMLElement;
  readonly select: HTMLButtonElement;
};
type GroupRendererOptions = {
  readonly layout: PaneLayout;
  readonly content: PaneSurfaceOptions["content"];
  readonly mode: PaneSurfaceOptions["mode"];
  readonly actions: PaneSurfaceActions;
  readonly focus: (groupId: string) => void;
  readonly drag: ReturnType<typeof createPaneDrag>;
  readonly groups: Map<string, PaneGroupDom>;
  readonly tabs: Map<string, PaneTabDom>;
  readonly hosts: Map<string, HTMLElement>;
};

export function paneLabel(tab: PaneTab): string {
  if (tab.kind === "graph") return tab.local ? "로컬 그래프" : "그래프";
  return (
    tab.path
      .split("/")
      .at(-1)
      ?.replace(/\.(md|markdown)$/i, "") ?? tab.path
  );
}

function appendInOrder(parent: HTMLElement, children: readonly HTMLElement[]): void {
  for (const [index, child] of children.entries()) {
    if (parent.children[index] !== child)
      parent.insertBefore(child, parent.children[index] ?? null);
  }
}

function toolbar(options: GroupRendererOptions, dom: PaneGroupDom, group: PaneGroup): void {
  const tab = group.active ? options.layout.tabs.get(group.active) : undefined;
  const signature = `${group.active ?? ""}:${tab ? options.mode(tab) : ""}`;
  if (dom.signature === signature) return;
  dom.signature = signature;
  const crumb = document.createElement("span");
  crumb.className = "pane-breadcrumb";
  crumb.textContent = tab ? paneLabel(tab) : "빈 작업 그룹";
  crumb.title = tab?.kind === "note" ? tab.path : crumb.textContent;
  const actions = document.createElement("div");
  actions.className = "pane-toolbar-actions";
  if (tab?.kind === "note") {
    for (const [mode, name] of [
      ["live", "라이브"],
      ["source", "소스"],
      ["reading", "읽기"],
    ] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mode-label";
      button.textContent = name;
      button.setAttribute("aria-pressed", String(options.mode(tab) === mode));
      button.addEventListener("click", () => options.actions.mode(tab.id, mode));
      actions.append(button);
    }
  }
  actions.append(
    iconButton("그래프 열기", "♧", () => options.actions.graph(group.id)),
    iconButton("파일 탐색기 표시", "☰", options.actions.toggleExplorer),
    iconButton("정보 패널 표시", "◧", options.actions.toggleInspector),
  );
  dom.toolbar.replaceChildren(crumb, actions);
}

function tabDom(options: GroupRendererOptions, tab: PaneTab): PaneTabDom {
  const known = options.tabs.get(tab.id);
  if (known) return known;
  const node = document.createElement("div");
  node.className = "pane-tab";
  node.dataset["paneTab"] = tab.id;
  node.draggable = true;
  const open = document.createElement("button");
  open.type = "button";
  open.setAttribute("role", "tab");
  open.addEventListener("click", () => options.actions.select(tab.id));
  open.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const group = node.closest<HTMLElement>("[data-pane-group]")?.dataset["paneGroup"];
    if (group)
      options.actions.menu({
        group,
        tab: tab.id,
        anchor: open,
        point: { x: event.clientX, y: event.clientY },
      });
  });
  node.append(
    open,
    iconButton(`${paneLabel(tab)} 탭 닫기`, "×", () => options.actions.close(tab.id)),
  );
  node.addEventListener("dragstart", (event) => options.drag.start(tab.id, event));
  node.addEventListener("dragend", options.drag.clear);
  const value = { node, select: open };
  options.tabs.set(tab.id, value);
  return value;
}

function createGroup(options: GroupRendererOptions, group: PaneGroup): PaneGroupDom {
  const node = document.createElement("section");
  node.className = "pane-node pane-group";
  node.dataset["paneGroup"] = group.id;
  node.addEventListener("focusin", () => options.focus(group.id));
  node.addEventListener("pointerdown", () => options.focus(group.id));
  const tabs = document.createElement("nav");
  tabs.className = "pane-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "열린 탭");
  tabs.addEventListener("dragover", (event) => options.drag.overTabs(group.id, tabs, event));
  tabs.addEventListener("dragleave", () => options.drag.leaveTabs(tabs));
  tabs.addEventListener("drop", (event) => options.drag.dropTabs(group.id, tabs, event));
  const menu = iconButton("작업 그룹 메뉴", "⋯", () =>
    options.actions.menu({ group: group.id, anchor: menu }),
  );
  const controls = document.createElement("div");
  controls.className = "pane-tab-controls";
  controls.append(
    iconButton("새 노트", "+", () => options.actions.create(group.id)),
    menu,
  );
  const bar = document.createElement("div");
  bar.className = "pane-tab-bar";
  bar.append(tabs, controls);
  const toolbar = document.createElement("header");
  toolbar.className = "pane-toolbar";
  const content = document.createElement("div");
  content.className = "pane-content";
  const empty = document.createElement("div");
  empty.className = "pane-empty";
  const heading = document.createElement("h2");
  heading.textContent = "빈 작업 그룹";
  const description = document.createElement("p");
  description.textContent = "새 노트를 만들거나 다른 탭을 이곳으로 옮기세요.";
  empty.append(
    heading,
    description,
    iconButton("새 노트", "+", () => options.actions.create(group.id)),
  );
  node.append(bar, toolbar, content);
  const onGroup = (
    event: DragEvent,
    drop: (groupId: string, host: HTMLElement, value: DragEvent) => void,
  ) => {
    const target = event.target;
    if (!(target instanceof Node) || (target !== tabs && !tabs.contains(target)))
      drop(group.id, node, event);
  };
  node.addEventListener("dragover", (event) => onGroup(event, options.drag.overGroup));
  node.addEventListener("drop", (event) => onGroup(event, options.drag.dropGroup));
  return { node, tabs, toolbar, content, empty, signature: "" };
}

export function createPaneGroupRenderer(
  options: GroupRendererOptions,
): (group: PaneGroup) => HTMLElement {
  return (group) => {
    const dom = options.groups.get(group.id) ?? createGroup(options, group);
    options.groups.set(group.id, dom);
    const tabNodes: HTMLElement[] = [];
    for (const id of group.tabs) {
      const tab = options.layout.tabs.get(id);
      if (!tab) continue;
      const item = tabDom(options, tab);
      const active = id === group.active;
      item.node.classList.toggle("active", active);
      item.select.textContent = paneLabel(tab);
      item.select.title = tab.kind === "note" ? tab.path : paneLabel(tab);
      item.select.id = `pane-tab-${group.id}-${tab.id}`;
      item.select.setAttribute("aria-selected", String(active));
      item.select.setAttribute("aria-controls", `pane-content-${group.id}`);
      if (active) dom.content.setAttribute("aria-labelledby", item.select.id);
      tabNodes.push(item.node);
      let host = options.hosts.get(tab.id);
      if (!host) host = options.content(tab);
      if (host) {
        options.hosts.set(tab.id, host);
        host.hidden = !active;
        if (host.parentElement !== dom.content) dom.content.append(host);
      }
    }
    dom.content.id = `pane-content-${group.id}`;
    dom.content.setAttribute("role", "tabpanel");
    if (group.tabs.length === 0) dom.content.append(dom.empty);
    else dom.empty.remove();
    if (group.tabs.length === 0) {
      dom.content.removeAttribute("aria-labelledby");
      dom.content.setAttribute("aria-label", "빈 작업 그룹");
    } else dom.content.removeAttribute("aria-label");
    appendInOrder(dom.tabs, tabNodes);
    dom.node.classList.toggle("pane-group--active", group.id === options.layout.activeGroup);
    dom.node.classList.toggle("is-focused", group.id === options.layout.activeGroup);
    dom.node.classList.toggle(
      "pane-node--contains-active",
      group.id === options.layout.activeGroup,
    );
    toolbar(options, dom, group);
    return dom.node;
  };
}
