import { button, element } from "./dom";

export type PaneMenuItem = {
  readonly label: string;
  readonly run: () => void;
  readonly disabled?: boolean;
};
export type PaneMenuContext = {
  readonly group: string;
  readonly tab?: string;
  readonly anchor: HTMLElement;
  readonly point?: { readonly x: number; readonly y: number };
};

let closeCurrent: (() => void) | undefined;

export function showPaneMenu(context: PaneMenuContext, items: readonly PaneMenuItem[]) {
  closeCurrent?.();
  const menu = element("div", "pane-menu");
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "탭과 패널");
  menu.dataset["open"] = "true";
  const controller = new AbortController();
  const close = (restore = true) => {
    controller.abort();
    menu.remove();
    if (closeCurrent === close) closeCurrent = undefined;
    if (restore && context.anchor.isConnected) context.anchor.focus();
  };
  closeCurrent = close;
  for (const item of items) {
    const node = button(
      item.label,
      () => {
        close(false);
        item.run();
      },
      "pane-menu-item",
    );
    node.setAttribute("role", "menuitem");
    node.disabled = item.disabled ?? false;
    menu.append(node);
  }
  document.body.append(menu);
  const anchor = context.anchor.getBoundingClientRect();
  const point = context.point ?? { x: anchor.left, y: anchor.bottom };
  const bounds = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(point.x, innerWidth - bounds.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(point.y, innerHeight - bounds.height - 8))}px`;
  const enabled = [...menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
  enabled[0]?.focus();
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") close(false);
    else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const focused = document.activeElement;
      const index = focused instanceof HTMLButtonElement ? enabled.indexOf(focused) : -1;
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? enabled.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length;
      enabled[next]?.focus();
    }
  });
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target instanceof Node && !menu.contains(event.target)) close(false);
    },
    { capture: true, signal: controller.signal },
  );
  window.addEventListener("resize", () => close(), { signal: controller.signal });
}
