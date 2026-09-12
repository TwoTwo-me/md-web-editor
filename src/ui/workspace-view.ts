import type { Workspace } from "../core/workspace";
import { renderExplorer } from "./explorer";
import { renderInspector } from "./inspector";
import { getPreferences } from "./theme";
export function renderWorkspace(app: Workspace) {
  const { shell, sessions } = app;
  const active = sessions?.active ?? "";
  const notes = [...app.notes.values()];
  const files = getPreferences().linkAllFiles
    ? (app.vault?.entries.map((entry) => app.notes.get(entry.path) ?? { path: entry.path }) ?? [])
    : notes;
  renderExplorer(shell.tree, files, active, shell.search.value, (path) =>
    app.run(() => app.open(path)),
  );
  shell.treeLabel.textContent = `${shell.search.value ? "검색 결과" : "파일"}  ·  ${files.length}`;
  app.panes.render();
  renderInspector(
    shell.inspector,
    notes,
    active,
    (path, kind) => app.run(() => app.follow(path, kind)),
    (line) => sessions?.current()?.editor.goToLine(line),
    () => {
      shell.shell.classList.remove("show-inspector");
      if (innerWidth > 1100) shell.shell.classList.add("hide-inspector");
      shell.panes.querySelector<HTMLButtonElement>('.is-focused [title="정보 패널 표시"]')?.focus();
    },
  );
  app.renderStatus();
}
