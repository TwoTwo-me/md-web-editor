import type { Workspace } from "../core/workspace";
import { button, element, iconButton } from "./dom";
import { renderExplorer } from "./explorer";
import { renderInspector } from "./inspector";
export function renderWorkspace(app: Workspace) {
  const { shell, sessions } = app;
  const active = sessions?.active ?? "";
  const notes = [...app.notes.values()];
  renderExplorer(shell.tree, notes, active, shell.search.value, (path) =>
    app.run(() => app.open(path)),
  );
  shell.treeLabel.textContent = `${shell.search.value ? "검색 결과" : "파일"}  ·  ${notes.length}`;
  shell.tabs.replaceChildren();
  for (const session of sessions?.items.values() ?? []) {
    const tab = element(
      "div",
      `note-tab ${active === session.path && !app.graphVisible ? "active" : ""}`,
    );
    const label =
      session.path
        .split("/")
        .at(-1)
        ?.replace(/\.(md|markdown)$/i, "") ?? session.path;
    const open = button(label, () => app.run(() => app.open(session.path)));
    open.title = session.path;
    open.setAttribute("aria-current", String(active === session.path && !app.graphVisible));
    tab.append(
      open,
      iconButton(`${label} 탭 닫기`, "×", () => app.run(() => app.closeTab(session.path))),
    );
    shell.tabs.append(tab);
  }
  if (app.graphView) {
    const tab = element("div", `note-tab ${app.graphVisible ? "active" : ""}`);
    tab.append(
      button("그래프 뷰", () => app.showGraph()),
      iconButton("그래프 탭 닫기", "×", () => {
        app.graphView?.destroy();
        app.graphView = undefined;
        app.graphVisible = false;
        shell.graph.hidden = true;
        if (active) app.run(() => app.open(active));
        else app.showEmpty();
        app.render();
      }),
    );
    shell.tabs.append(tab);
  }
  shell.tabs.append(iconButton("새 노트", "+", () => app.createNote()));
  shell.breadcrumbs.textContent = app.graphVisible ? "그래프 뷰" : active || "작업 공간";
  shell.breadcrumbs.title = active;
  shell.modeTools.replaceChildren();
  shell.modeTools.classList.add("mode-tools");
  for (const [mode, label] of [
    ["live", "라이브"],
    ["source", "소스"],
    ["reading", "읽기"],
  ] as const) {
    const b = button(
      label,
      () => app.mode(mode),
      `mode-label ${sessions?.mode === mode && !app.graphVisible ? "active" : ""}`,
    );
    b.setAttribute("aria-pressed", String(sessions?.mode === mode && !app.graphVisible));
    b.disabled = !active;
    shell.modeTools.append(b);
  }
  shell.modeTools.append(
    iconButton("그래프 뷰", "♧", () => app.showGraph()),
    iconButton("정보 패널 표시", "◧", () => {
      shell.shell.classList.toggle(innerWidth <= 1100 ? "show-inspector" : "hide-inspector");
    }),
  );
  renderInspector(
    shell.inspector,
    notes,
    active,
    (path, kind) => app.run(() => app.follow(path, kind)),
    (line) => sessions?.current()?.editor.goToLine(line),
    () => {
      shell.shell.classList.remove("show-inspector");
      if (innerWidth > 1100) shell.shell.classList.add("hide-inspector");
      shell.modeTools.querySelector<HTMLButtonElement>('[title="정보 패널 표시"]')?.focus();
    },
  );
  app.renderStatus();
}
