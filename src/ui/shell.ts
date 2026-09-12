import { element, iconButton } from "./dom";
export function createShell(root: HTMLElement) {
  const shell = element("div", "shell");
  const rail = element("nav", "rail");
  rail.setAttribute("aria-label", "주요 도구");
  const brand = element("span", "brand", ".md");
  brand.title = "md-web-editor";
  const railTop = element("div", "rail-tools");
  const railBottom = element("div", "rail-tools rail-bottom");
  rail.append(brand, railTop, railBottom);
  const explorer = element("aside", "explorer");
  explorer.setAttribute("aria-label", "파일 탐색기");
  const vaultHeader = element("header", "vault-header");
  const vaultName = element("strong", "vault-name", "md-web-editor");
  const vaultActions = element("div", "inline-actions");
  const closeExplorer = iconButton("파일 패널 닫기", "×", () =>
    shell.classList.add("hide-explorer"),
  );
  closeExplorer.classList.add("mobile-only");
  vaultActions.append(closeExplorer);
  vaultHeader.append(vaultName, vaultActions);
  const search = element("input", "vault-search");
  search.type = "search";
  search.placeholder = "노트 검색…";
  search.setAttribute("aria-label", "노트 검색");
  const treeLabel = element("div", "section-label", "파일");
  const tree = element("div", "file-tree");
  const vaultFooter = element("div", "vault-footer");
  explorer.append(vaultHeader, search, treeLabel, tree, vaultFooter);
  const main = element("main", "main-panel");
  const panes = element("div", "workspace-panes");
  panes.hidden = true;
  const documents = element("div", "documents");
  documents.hidden = true;
  const welcome = element("div", "welcome");
  main.append(welcome, panes, documents);
  const inspector = element("aside", "inspector");
  inspector.setAttribute("aria-label", "노트 정보");
  const status = element("footer", "status-bar");
  const saveState = element("button", "save-status", "폴더를 열어 시작하세요");
  saveState.type = "button";
  saveState.setAttribute("aria-live", "polite");
  const metrics = element("span", "status-metrics");
  const prefix = element("button", "prefix-button", "명령  Esc → P");
  prefix.type = "button";
  status.append(saveState, metrics, prefix);
  shell.append(rail, explorer, main, inspector, status);
  root.append(shell);
  installResize(explorer, "--left-width", 180, 440, false);
  installResize(inspector, "--right-width", 220, 460, true);
  return {
    shell,
    railTop,
    railBottom,
    vaultName,
    vaultActions,
    search,
    treeLabel,
    tree,
    vaultFooter,
    panes,
    welcome,
    documents,
    inspector,
    saveState,
    metrics,
    prefix,
  };
}
function installResize(
  host: HTMLElement,
  token: string,
  min: number,
  max: number,
  reverse: boolean,
) {
  const handle = element("div", `resize-handle ${reverse ? "from-left" : ""}`);
  handle.tabIndex = 0;
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "vertical");
  handle.setAttribute("aria-label", reverse ? "정보 패널 너비" : "파일 패널 너비");
  handle.setAttribute("aria-valuemin", String(min));
  handle.setAttribute("aria-valuemax", String(max));
  const set = (value: number) => {
    const width = Math.min(max, Math.max(min, value));
    document.documentElement.style.setProperty(token, `${width}px`);
    handle.setAttribute("aria-valuenow", String(Math.round(width)));
  };
  handle.setAttribute("aria-valuenow", String(reverse ? 264 : 244));
  handle.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      set(
        host.getBoundingClientRect().width +
          (event.key === "ArrowRight" ? 16 : -16) * (reverse ? -1 : 1),
      );
    }
  });
  handle.addEventListener("pointerdown", (event) => {
    const start = event.clientX;
    const width = host.getBoundingClientRect().width;
    handle.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => set(width + (e.clientX - start) * (reverse ? -1 : 1));
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end, { once: true });
  });
  host.append(handle);
}
export type Shell = ReturnType<typeof createShell>;
