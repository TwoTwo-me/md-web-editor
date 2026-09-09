import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, redo, undo } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { forceParsing } from "@codemirror/language";
import { openSearchPanel, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import type { EditorMode, EditorOptions, NoteEditor } from "../core/types";
import { livePreview } from "./live";
import { indexDocument, renderMarkdown } from "./markdown";
import "../styles/editor.css";

const modeCompartment = new Compartment();
const readonlyCompartment = new Compartment();
const lineNumberCompartment = new Compartment();

function wikiCompletion(options: EditorOptions) {
  return (context: CompletionContext) => {
    const prefix = context.state.sliceDoc(Math.max(0, context.pos - 256), context.pos);
    const match = /\[\[([^\]\n]*)$/u.exec(prefix);
    if (!match) return null;
    return {
      from: context.pos - (match[1]?.length ?? 0),
      options: options
        .completions()
        .map((path) => ({ label: path, type: "file", apply: `${path}]]` })),
    };
  };
}

function replacement(view: EditorView, before: string, after: string): void {
  const selection = view.state.selection.main;
  const selected = view.state.sliceDoc(selection.from, selection.to);
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

function format(
  view: EditorView,
  action: Parameters<NoteEditor["format"]>[0],
  writable: boolean,
): void {
  if (!writable) return;
  if (action === "bold") replacement(view, "**", "**");
  else if (action === "italic") replacement(view, "*", "*");
  else if (action === "code") replacement(view, "`", "`");
  else if (action === "link") replacement(view, "[[", "]]");
  else if (action === "heading") prefixLine(view, "# ");
  else if (action === "task") prefixLine(view, "- [ ] ");
  else prefixLine(view, "> ");
}

function readonlyExtension(value: boolean) {
  return [EditorState.readOnly.of(value), EditorView.editable.of(!value)];
}

export function createEditor(options: EditorOptions): NoteEditor {
  let currentMode: EditorMode = options.mode;
  let currentPath = options.path;
  let isReadonly = options.readonly;
  let replacingDocument = false;
  let releaseReading: () => void = () => undefined;
  const shell = document.createElement("section");
  shell.className = "note-editor";
  shell.setAttribute("data-mode", currentMode);
  const reading = document.createElement("article");
  reading.hidden = currentMode !== "reading";
  shell.append(reading);
  options.parent.append(shell);
  const state = (content: string) =>
    EditorState.create({
      doc: content,
      extensions: [
        history(),
        markdown(),
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        autocompletion({ override: [wikiCompletion(options)] }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !replacingDocument)
            options.onChange(update.state.doc.toString());
        }),
        modeCompartment.of(
          currentMode === "live"
            ? livePreview({
                path: () => currentPath,
                asset: options.asset,
                onLink: options.onLink,
                writable: () => !isReadonly,
              })
            : [],
        ),
        readonlyCompartment.of(readonlyExtension(isReadonly)),
        lineNumberCompartment.of(currentMode === "source" ? lineNumbers() : []),
      ],
    });
  const view = new EditorView({
    state: state(options.content),
    parent: shell,
  });
  const refreshLive = (): void => {
    if (currentMode !== "live") return;
    forceParsing(view, view.state.doc.length);
    view.dispatch({});
  };
  refreshLive();
  const showReading = (): void => {
    releaseReading();
    reading.hidden = false;
    view.dom.hidden = true;
    releaseReading = renderMarkdown(view.state.doc.toString(), {
      source: currentPath,
      root: reading,
      asset: options.asset,
      onLink: options.onLink,
    });
    const headings = indexDocument(view.state.doc.toString()).headings;
    reading.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6").forEach((heading, index) => {
      const metadata = headings[index];
      if (metadata) {
        heading.id = metadata.id;
        heading.setAttribute("data-source-line", String(metadata.line));
      }
    });
  };
  const setMode = (mode: EditorMode): void => {
    currentMode = mode;
    shell.setAttribute("data-mode", mode);
    const readingMode = mode === "reading";
    view.dispatch({
      effects: [
        modeCompartment.reconfigure(
          mode === "live"
            ? livePreview({
                path: () => currentPath,
                asset: options.asset,
                onLink: options.onLink,
                writable: () => !isReadonly,
              })
            : [],
        ),
        lineNumberCompartment.reconfigure(mode === "source" ? lineNumbers() : []),
      ],
    });
    if (readingMode) showReading();
    else {
      releaseReading();
      reading.hidden = true;
      view.dom.hidden = false;
      refreshLive();
    }
  };
  if (currentMode === "reading") showReading();
  return {
    setDocument(content, path) {
      currentPath = path;
      replacingDocument = true;
      view.setState(state(content));
      replacingDocument = false;
      refreshLive();
      if (currentMode === "reading") showReading();
    },
    setMode,
    setReadonly(value) {
      isReadonly = value;
      view.dispatch({ effects: readonlyCompartment.reconfigure(readonlyExtension(value)) });
    },
    getContent() {
      return view.state.doc.toString();
    },
    focus() {
      view.focus();
    },
    goToLine(line) {
      if (currentMode === "reading") {
        const target = [...reading.querySelectorAll<HTMLElement>("[data-source-line]")]
          .filter((heading) => Number(heading.getAttribute("data-source-line")) <= line)
          .at(-1);
        (target ?? reading).scrollIntoView({ block: "center" });
        reading.tabIndex = -1;
        reading.focus();
        return;
      }
      const destination = view.state.doc.line(
        Math.max(1, Math.min(line, view.state.doc.lines)),
      ).from;
      view.dispatch({
        selection: { anchor: destination },
        effects: EditorView.scrollIntoView(destination, { y: "center" }),
      });
      view.focus();
    },
    format(action) {
      format(view, action, !isReadonly);
    },
    undo() {
      if (!isReadonly) undo(view);
    },
    redo() {
      if (!isReadonly) redo(view);
    },
    find() {
      openSearchPanel(view);
    },
    destroy() {
      releaseReading();
      view.destroy();
      shell.remove();
    },
  };
}
