import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import { type EditorState, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import type { NoteLink } from "../core/types";
import { renderMarkdown } from "./markdown";

type LiveOptions = {
  readonly path: () => string;
  readonly asset: (target: string) => Promise<Blob | undefined>;
  readonly onLink: (target: string, kind?: NoteLink["kind"]) => void;
  readonly writable: () => boolean;
};
type Block = { readonly from: number; readonly to: number };

function blocks(state: EditorState): readonly Block[] {
  const cursor = (ensureSyntaxTree(state, state.doc.length, 20) ?? syntaxTree(state)).cursor();
  const output: Block[] = [];
  if (!cursor.firstChild()) return output;
  do {
    if (cursor.to > cursor.from) output.push({ from: cursor.from, to: cursor.to });
  } while (cursor.nextSibling());
  return output;
}

function selected(state: EditorState, block: Block): boolean {
  const range = state.selection.main;
  return range.from <= block.to && range.to >= block.from;
}

function taskPositions(content: string): readonly number[] {
  return [...content.matchAll(/\[[ xX]\]/gu)].map((match) => (match.index ?? 0) + 1);
}

class PreviewWidget extends WidgetType {
  constructor(
    private readonly from: number,
    private readonly content: string,
    private readonly options: LiveOptions,
  ) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof PreviewWidget && other.content === this.content && other.from === this.from
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const root = document.createElement("div");
    root.className = "cm-md-preview";
    const release = renderMarkdown(this.content, {
      source: this.options.path(),
      root,
      asset: this.options.asset,
      onLink: this.options.onLink,
    });
    root.classList.add("cm-md-preview");
    const offsets = taskPositions(this.content);
    root.querySelectorAll<HTMLElement>(".task-checkbox").forEach((box, index) => {
      box.tabIndex = this.options.writable() ? 0 : -1;
      box.addEventListener("click", () => this.toggle(view, offsets[index]));
      box.addEventListener("keydown", (event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          this.toggle(view, offsets[index]);
        }
      });
    });
    root.addEventListener("DOMNodeRemoved", release, { once: true });
    return root;
  }

  destroy(dom: HTMLElement): void {
    dom.dispatchEvent(new Event("DOMNodeRemoved"));
  }

  private toggle(view: EditorView, offset: number | undefined): void {
    if (!this.options.writable() || offset === undefined) return;
    const position = this.from + offset;
    const value = view.state.sliceDoc(position, position + 1);
    view.dispatch({
      changes: {
        from: position,
        to: position + 1,
        insert: value.toLocaleLowerCase() === "x" ? " " : "x",
      },
    });
  }
}

function decorations(state: EditorState, options: LiveOptions): DecorationSet {
  const ranges = blocks(state)
    .filter((block) => !selected(state, block))
    .map((block) =>
      Decoration.replace({
        block: true,
        widget: new PreviewWidget(block.from, state.sliceDoc(block.from, block.to), options),
      }).range(block.from, block.to),
    );
  return Decoration.set(ranges, true);
}

export function livePreview(options: LiveOptions) {
  const field = StateField.define<DecorationSet>({
    create(state) {
      return decorations(state, options);
    },
    update(_value, transaction) {
      return decorations(transaction.state, options);
    },
    provide: (value) => EditorView.decorations.from(value),
  });
  return field;
}
