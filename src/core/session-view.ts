import { createEditor } from "../editor/editor";
import { resolveLink } from "../editor/markdown";
import { element } from "../ui/dom";
import { getPreferences } from "../ui/theme";
import type { EditorMode, NoteEditor, NoteLink, Vault } from "./types";

export type SessionView = {
  readonly id: string;
  readonly path: string;
  readonly host: HTMLElement;
  readonly editor: NoteEditor;
  mode: EditorMode;
};

type ViewOptions = {
  readonly id: string;
  readonly path: string;
  readonly parent: HTMLElement;
  readonly content: string;
  readonly mode: EditorMode;
  readonly readonly: boolean;
  readonly vault: Vault;
  readonly onChange: (id: string, content: string) => void;
  readonly onLink: (id: string, target: string, kind?: NoteLink["kind"]) => void;
  readonly onFocus: (id: string) => void;
};

export function createSessionView(options: ViewOptions): SessionView {
  const host = element("div", "document-host");
  host.dataset["viewId"] = options.id;
  options.parent.append(host);
  host.addEventListener("focusin", () => options.onFocus(options.id));
  const editor = createEditor({
    parent: host,
    content: options.content,
    path: options.path,
    readonly: options.readonly,
    mode: options.mode,
    onChange: (content) => options.onChange(options.id, content),
    onLink: (target, kind) => options.onLink(options.id, target, kind),
    completions: () => notePaths(options.vault),
    asset: (target) => asset(options.vault, options.path, target),
  });
  return { id: options.id, path: options.path, host, editor, mode: options.mode };
}

export function destroySessionView(view: SessionView): void {
  view.editor.destroy();
  view.host.remove();
}

function notePaths(vault: Vault): readonly string[] {
  const allFiles = getPreferences().linkAllFiles;
  return vault.entries
    .filter((entry) => entry.kind === "note" || allFiles)
    .map((entry) => entry.path);
}

async function asset(vault: Vault, path: string, target: string): Promise<Blob | undefined> {
  const resolved = resolveLink(
    path,
    target,
    vault.entries.map((entry) => entry.path),
    "embed",
  );
  return resolved.kind === "note" ? vault.asset(resolved.path) : undefined;
}
