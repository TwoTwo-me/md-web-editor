import type { EditorView } from "@codemirror/view";
import type { NoteEditor } from "../core/types";
import { resolvedWikiLinkContent } from "./wiki-edits";

type FormatOptions = {
  readonly writable: boolean;
  readonly source: () => string;
  readonly completions: () => readonly string[];
};

export function applyFormat(
  view: EditorView,
  action: Parameters<NoteEditor["format"]>[0],
  options: FormatOptions,
): void {
  if (!options.writable) return;
  if (action === "bold") replacement(view, "**", "**");
  else if (action === "italic") replacement(view, "*", "*");
  else if (action === "code") replacement(view, "`", "`");
  else if (action === "link") {
    const selection = view.state.selection.main;
    const selected = view.state.sliceDoc(selection.from, selection.to);
    const content = resolvedWikiLinkContent(options.source(), selected, options.completions());
    replacement(view, "[[", "]]", content ?? selected);
  } else if (action === "heading") prefixLine(view, "# ");
  else if (action === "task") prefixLine(view, "- [ ] ");
  else prefixLine(view, "> ");
}

function replacement(view: EditorView, before: string, after: string, content?: string): void {
  const selection = view.state.selection.main;
  const selected = content ?? view.state.sliceDoc(selection.from, selection.to);
  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: `${before}${selected}${after}` },
    selection: {
      anchor: selection.from + before.length,
      head: selection.from + before.length + selected.length,
    },
  });
}

function prefixLine(view: EditorView, prefix: string): void {
  const line = view.state.doc.lineAt(view.state.selection.main.from);
  view.dispatch({ changes: { from: line.from, insert: prefix } });
}
