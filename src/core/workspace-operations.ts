import { indexDocument, resolveLink } from "../editor/markdown";
import { normalizePath } from "../storage/paths";
import { showChoices } from "../ui/commands";
import { askText, openDialog } from "../ui/dialog";
import { element } from "../ui/dom";
import type { NoteLink } from "./types";
import type { Workspace } from "./workspace";
import { readWorkspaceNotes } from "./workspace-data";

export async function followWorkspaceLink(
  workspace: Workspace,
  target: string,
  kind?: NoteLink["kind"],
): Promise<void> {
  const source = workspace.sessions?.active ?? "";
  const result =
    kind === undefined && workspace.notes.has(target)
      ? { kind: "note" as const, path: target, anchor: "" }
      : resolveLink(
          source,
          target,
          workspace.vault?.entries.map((entry) => entry.path) ?? [],
          kind,
        );
  if (result.kind === "external") {
    const { dialog, body } = openDialog("외부 링크 열기");
    body.append(
      element(
        "p",
        "muted",
        "이 주소를 열면 외부 사이트에 접속합니다. 노트 내용은 전송하지 않습니다.",
      ),
      element("p", "external-destination", result.url),
    );
    const link = element("a", "button primary", "외부 사이트 열기");
    link.href = result.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.referrerPolicy = "no-referrer";
    link.addEventListener("click", () => dialog.close());
    body.append(link);
    return;
  }
  if (result.kind === "blocked") {
    workspace.notice("안전하지 않거나 지원하지 않는 링크입니다.");
    return;
  }
  if (result.kind === "ambiguous") {
    showChoices(
      "같은 이름의 노트",
      result.paths.map((path) => ({
        label: path,
        run: () => workspace.run(() => workspace.open(path)),
      })),
    );
    return;
  }
  if (result.kind === "missing") {
    createWorkspaceNote(workspace, result.path);
    return;
  }
  if (workspace.vault?.entries.find((entry) => entry.path === result.path)?.kind === "asset") {
    workspace.notice("이미지 첨부는 노트 안에서 미리 볼 수 있습니다.");
    return;
  }
  await workspace.open(result.path);
  if (!result.anchor) return;
  const note = workspace.notes.get(result.path);
  const anchor = result.anchor.replace(/^#/, "");
  const heading =
    note &&
    indexDocument(note.content).headings.find((item) => item.id === anchor || item.text === anchor);
  if (heading) workspace.sessions?.current()?.editor.goToLine(heading.line);
  else if (note && anchor.startsWith("^")) {
    const line = note.content.split("\n").findIndex((text) => text.trimEnd().endsWith(anchor));
    if (line >= 0) workspace.sessions?.current()?.editor.goToLine(line + 1);
  }
}

export function createWorkspaceNote(workspace: Workspace, initial = "새 노트.md"): void {
  const vault = workspace.vault;
  if (!vault) {
    workspace.notice("먼저 폴더 또는 예제 공간을 여세요.");
    return;
  }
  if (vault.kind === "readonly") {
    workspace.notice("읽기 전용 폴더입니다. Chrome 또는 Edge에서 폴더를 다시 여세요.");
    return;
  }
  askText("새 노트", initial, async (value) => {
    const path = normalizePath(/\.(md|markdown)$/i.test(value) ? value : `${value}.md`);
    const title =
      path
        .split("/")
        .at(-1)
        ?.replace(/\.(md|markdown)$/i, "") ?? "새 노트";
    const snapshot = await vault.create(path, `# ${title}\n\n`);
    await vault.refresh();
    if (vault !== workspace.vault) return;
    workspace.notes.set(path, { path, content: snapshot.content });
    await workspace.open(path);
    workspace.render();
    workspace.graphView?.update(workspace.graphData(), path);
  });
}

export async function refreshWorkspace(workspace: Workspace): Promise<void> {
  const vault = workspace.vault;
  const sessions = workspace.sessions;
  const token = workspace.version();
  if (!vault) return;
  const release = sessions?.hold() ?? (() => undefined);
  try {
    if (!(await workspace.canLeave())) return;
    await vault.refresh();
    const next = await readWorkspaceNotes(vault);
    if (token !== workspace.version() || vault !== workspace.vault) return;
    for (const session of [...(sessions?.items.values() ?? [])]) {
      if (next.has(session.path)) {
        const reloaded = await sessions?.reload(session.path);
        if (!reloaded) {
          const current = sessions?.items.get(session.path);
          if (current)
            next.set(session.path, { path: session.path, content: current.editor.getContent() });
        }
      } else if (!(await sessions?.close(session.path)))
        next.set(session.path, { path: session.path, content: session.editor.getContent() });
    }
    if (token !== workspace.version() || vault !== workspace.vault) return;
    workspace.notes.clear();
    for (const [path, note] of next) workspace.notes.set(path, note);
    if (!sessions?.active) {
      const next = [...(sessions?.items.keys() ?? [])].at(-1);
      if (next) await workspace.open(next);
      else workspace.showEmpty();
    }
    workspace.render();
    workspace.graphView?.update(workspace.graphData(), sessions?.active ?? "");
    workspace.notice("폴더의 변경 내용을 확인했습니다.");
  } finally {
    release();
  }
}
