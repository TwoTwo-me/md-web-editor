// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EditorMode,
  EditorOptions,
  FileSnapshot,
  NoteEditor,
  WritableVault,
} from "../src/core/types";

const harness = vi.hoisted(() => ({
  editors: new Map<string, FakeEditor>(),
  saves: [] as string[],
}));

class FakeEditor implements NoteEditor {
  content: string;
  mode: EditorMode;
  readonly: boolean;
  destroyed = false;
  constructor(readonly options: EditorOptions) {
    this.content = options.content;
    this.mode = options.mode;
    this.readonly = options.readonly;
  }
  setDocument(content: string): void {
    this.content = content;
  }
  syncContent(content: string): void {
    this.content = content;
  }
  setMode(mode: EditorMode): void {
    this.mode = mode;
  }
  setReadonly(value: boolean): void {
    this.readonly = value;
  }
  getContent(): string {
    return this.content;
  }
  focus(): void {}
  goToLine(): void {}
  format(): void {}
  undo(): void {}
  redo(): void {}
  find(): void {}
  destroy(): void {
    this.destroyed = true;
  }
  type(content: string): void {
    this.content = content;
    this.options.onChange(content);
  }
}

vi.mock("../src/editor/editor", () => ({
  createEditor: (options: EditorOptions) => {
    const editor = new FakeEditor(options);
    harness.editors.set(options.parent.dataset["viewId"] ?? "", editor);
    return editor;
  },
}));
vi.mock("../src/storage/autosave", () => ({
  createAutosave: () => ({
    edit: (content: string) => harness.saves.push(content),
    flush: async () => true,
    getContent: () => "",
    getSnapshot: () => ({ content: "", fingerprint: "" }),
    dispose: () => undefined,
  }),
}));
vi.mock("../src/storage/journal", () => ({
  readDraft: vi.fn(async () => undefined),
  discardDraft: vi.fn(async () => undefined),
  discardSpecificDraft: vi.fn(async () => undefined),
}));

import { SessionDestroyedError, Sessions } from "../src/core/sessions";

class MemoryVault implements WritableVault {
  readonly id = "views";
  readonly name = "views";
  readonly kind = "demo" as const;
  readonly entries = [{ path: "one.md", kind: "note" as const, modified: 1 }];
  content = "base";
  async read(): Promise<FileSnapshot> {
    return { content: this.content, fingerprint: this.content };
  }
  async asset(): Promise<Blob | undefined> {
    return undefined;
  }
  async refresh(): Promise<void> {}
  close(): void {}
  async write(): Promise<FileSnapshot> {
    return { content: "", fingerprint: "" };
  }
  async create(): Promise<FileSnapshot> {
    return { content: "", fingerprint: "" };
  }
}

class DelayedVault extends MemoryVault {
  private releaseRead: (() => void) | undefined;
  async read(): Promise<FileSnapshot> {
    await new Promise<void>((resolve) => {
      this.releaseRead = resolve;
    });
    return super.read();
  }
  release(): void {
    this.releaseRead?.();
  }
}

function sessions(): Sessions {
  return new Sessions({
    vault: new MemoryVault(),
    parent: document.createElement("main"),
    onChange: () => undefined,
    onStatus: () => undefined,
    onLink: () => undefined,
  });
}

describe("shared document session views", () => {
  beforeEach(() => {
    harness.editors.clear();
    harness.saves.length = 0;
  });

  it("synchronizes duplicate note views through one autosave", async () => {
    const subject = sessions();
    await subject.ensureView("one.md", "left");
    await subject.ensureView("one.md", "right");

    harness.editors.get("left")?.type("left edit");

    expect(harness.editors.get("right")?.getContent()).toBe("left edit");
    expect(harness.saves).toEqual(["left edit"]);
  });

  it("keeps the document alive when one of two views closes", async () => {
    const subject = sessions();
    await subject.ensureView("one.md", "left");
    await subject.ensureView("one.md", "right");

    await expect(subject.closeView("left")).resolves.toBe(true);

    expect(subject.items.has("one.md")).toBe(true);
    expect(subject.views.has("right")).toBe(true);
    expect(harness.editors.get("right")?.destroyed).toBe(false);
  });

  it("refuses to close the final view when its canonical save conflicts", async () => {
    const subject = sessions();
    await subject.ensureView("one.md", "left");
    const save = subject.items.get("one.md")?.save;
    if (!save) throw new Error("Expected canonical autosave");
    save.flush = async () => false;

    await expect(subject.closeView("left")).resolves.toBe(false);

    expect(subject.views.has("left")).toBe(true);
    expect(subject.items.has("one.md")).toBe(true);
  });

  it("reloads the canonical disk document into every view", async () => {
    const vault = new MemoryVault();
    const subject = new Sessions({
      vault,
      parent: document.createElement("main"),
      onChange: () => undefined,
      onStatus: () => undefined,
      onLink: () => undefined,
    });
    await subject.ensureView("one.md", "left");
    await subject.ensureView("one.md", "right");
    vault.content = "from disk";

    await expect(subject.reload("one.md")).resolves.toBe(true);

    expect(harness.editors.get("left")?.getContent()).toBe("from disk");
    expect(harness.editors.get("right")?.getContent()).toBe("from disk");
  });

  it("activates the link source before sending its workspace callback", async () => {
    const links: string[] = [];
    const focused: string[] = [];
    const subject = new Sessions({
      vault: new MemoryVault(),
      parent: document.createElement("main"),
      onChange: () => undefined,
      onStatus: () => undefined,
      onLink: (target) => links.push(`${subject.activeView}:${target}`),
      onFocus: (id) => focused.push(id),
    });
    await subject.ensureView("one.md", "left");
    await subject.ensureView("one.md", "right");

    harness.editors.get("right")?.options.onLink("target.md", "wiki");

    expect(links).toEqual(["right:target.md"]);
    expect(focused).toEqual(["right"]);
  });

  it("rejects a stale pending view after session destruction", async () => {
    const vault = new DelayedVault();
    const subject = new Sessions({
      vault,
      parent: document.createElement("main"),
      onChange: () => undefined,
      onStatus: () => undefined,
      onLink: () => undefined,
    });
    const opening = subject.ensureView("one.md", "left");
    await Promise.resolve();
    subject.destroy();
    vault.release();

    await expect(opening).rejects.toBeInstanceOf(SessionDestroyedError);
    expect(subject.items).toEqual(new Map());
    expect(subject.views).toEqual(new Map());
  });

  it("keeps modes independent and activates the view receiving focus", async () => {
    const subject = sessions();
    const left = await subject.ensureView("one.md", "left");
    const right = await subject.ensureView("one.md", "right");
    subject.activateView("left");
    subject.setMode("reading");
    subject.activateView("right");
    subject.setMode("source");

    left.host.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(left.mode).toBe("reading");
    expect(right.mode).toBe("source");
    expect(subject.activeView).toBe("left");
  });
});
