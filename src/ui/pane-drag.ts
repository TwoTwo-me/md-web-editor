export type PaneDropPosition = "center" | "left" | "right" | "top" | "bottom";

export type PaneDropTarget = {
  readonly group: string;
  readonly position: PaneDropPosition;
  readonly index?: number;
};

type DragOptions = {
  readonly move: (tabId: string, target: PaneDropTarget) => void;
};

type ActiveDrag = { readonly tabId: string } | undefined;

function edgeTarget(group: string, event: DragEvent, host: HTMLElement): PaneDropTarget {
  const box = host.getBoundingClientRect();
  const width = Math.max(box.width, 1);
  const height = Math.max(box.height, 1);
  const x = (event.clientX - box.left) / width;
  const y = (event.clientY - box.top) / height;
  if (x < 0.25) return { group, position: "left" };
  if (x > 0.75) return { group, position: "right" };
  if (y < 0.25) return { group, position: "top" };
  if (y > 0.75) return { group, position: "bottom" };
  return { group, position: "center" };
}

function tabIndex(host: HTMLElement, event: DragEvent): number {
  const tabs = [...host.querySelectorAll<HTMLElement>("[data-pane-tab]")];
  const target =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-pane-tab]")
      : undefined;
  if (!target) return tabs.length;
  const index = tabs.indexOf(target);
  if (index < 0) return tabs.length;
  const box = target.getBoundingClientRect();
  return event.clientX < box.left + box.width / 2 ? index : index + 1;
}

function clearPreview(root: HTMLElement): void {
  for (const node of root.querySelectorAll<HTMLElement>(".pane-group[data-drop-position]")) {
    delete node.dataset["dropPosition"];
  }
}

export function createPaneDrag(options: DragOptions) {
  let active: ActiveDrag;
  let preview: HTMLElement | undefined;
  const strips = new Set<HTMLElement>();

  const clear = () => {
    if (preview) delete preview.dataset["dropPosition"];
    for (const strip of strips) {
      delete strip.dataset["dropIndex"];
      delete strip.dataset["dropGroup"];
    }
    strips.clear();
    preview = undefined;
    active = undefined;
  };

  const start = (tabId: string, event: DragEvent) => {
    active = { tabId };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/x-md-web-tab", tabId);
    }
  };

  const overGroup = (group: string, host: HTMLElement, event: DragEvent) => {
    if (!active) return;
    event.preventDefault();
    const target = edgeTarget(group, event, host);
    if (preview && preview !== host) delete preview.dataset["dropPosition"];
    preview = host;
    host.dataset["dropPosition"] = target.position;
  };

  const overTabs = (group: string, host: HTMLElement, event: DragEvent) => {
    if (!active) return;
    event.preventDefault();
    if (preview) delete preview.dataset["dropPosition"];
    preview = undefined;
    host.dataset["dropIndex"] = String(tabIndex(host, event));
    host.dataset["dropGroup"] = group;
    strips.add(host);
  };

  const leaveTabs = (host: HTMLElement) => {
    delete host.dataset["dropIndex"];
    delete host.dataset["dropGroup"];
    strips.delete(host);
  };

  const dropGroup = (group: string, host: HTMLElement, event: DragEvent) => {
    if (!active) return;
    event.preventDefault();
    const target = edgeTarget(group, event, host);
    options.move(active.tabId, target);
    clearPreview(host.ownerDocument.body);
    clear();
  };

  const dropTabs = (group: string, host: HTMLElement, event: DragEvent) => {
    if (!active) return;
    event.preventDefault();
    options.move(active.tabId, { group, position: "center", index: tabIndex(host, event) });
    leaveTabs(host);
    clear();
  };

  return { start, overGroup, overTabs, leaveTabs, dropGroup, dropTabs, clear };
}
