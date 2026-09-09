import { createEditor } from "../editor/editor";
import { resolveLink } from "../editor/markdown";
import { type Autosave, createAutosave, type SaveStatus } from "../storage/autosave";
import { type Draft, discardDraft, discardSpecificDraft, readDraft } from "../storage/journal";
import { element } from "../ui/dom";
import { offerRecovery } from "./session-recovery";
import { showSaveDialog } from "./session-save-dialog";
import type { EditorMode, FileSnapshot, NoteEditor, NoteLink, Vault } from "./types";
export type Session = {
  readonly path: string;
  readonly editor: NoteEditor;
  readonly host: HTMLElement;
  save: Autosave | undefined;
  status: SaveStatus;
  snapshot: FileSnapshot;
  revision: number;
  recovery: Draft | undefined;
};
export type SessionOptions = {
  readonly vault: Vault;
  readonly parent: HTMLElement;
  readonly onChange: (path: string, content: string) => void;
  readonly onStatus: () => void;
  readonly onLink: (target: string, kind?: NoteLink["kind"]) => void;
};
export class Sessions {
  readonly items = new Map<string, Session>();
  active = "";
  mode: EditorMode = "live";
  private generation = 0;
  private holds = 0;
  constructor(readonly options: SessionOptions) {}
  current() {
    return this.items.get(this.active);
  }
  revisions(): ReadonlyMap<string, number> {
    return new Map([...this.items].map(([path, session]) => [path, session.revision]));
  }
  changedSince(revisions: ReadonlyMap<string, number>): boolean {
    return [...this.items].some(([path, session]) => revisions.get(path) !== session.revision);
  }
  hold(): () => void {
    this.holds += 1;
    for (const session of this.items.values()) session.editor.setReadonly(true);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.holds -= 1;
      if (this.holds === 0)
        for (const session of this.items.values())
          session.editor.setReadonly(this.options.vault.kind === "readonly");
    };
  }
  async open(path: string): Promise<boolean> {
    const token = ++this.generation;
    if (!(await this.flush())) return false;
    let session = this.items.get(path);
    if (!session) {
      const snapshot = await this.options.vault.read(path);
      if (token !== this.generation) return false;
      let content = snapshot.content;
      let needsRecoveryReview = false;
      const draft = await readDraft(this.options.vault.id, path);
      if (token !== this.generation) return false;
      if (draft && draft.content !== content && this.options.vault.kind !== "readonly") {
        const recovered = await offerRecovery(
          path,
          draft.content,
          snapshot.content,
          draft.baseFingerprint !== snapshot.fingerprint,
        );
        if (token !== this.generation) return false;
        if (recovered === "recover") {
          content = draft.content;
          needsRecoveryReview = draft.baseFingerprint !== snapshot.fingerprint;
        } else if (recovered === "disk") await discardSpecificDraft(draft);
      }
      const host = element("div", "document-host");
      this.options.parent.append(host);
      const editor = createEditor({
        parent: host,
        content,
        path,
        readonly: this.options.vault.kind === "readonly" || this.holds > 0,
        mode: this.mode,
        onChange: (value) => {
          const s = this.items.get(path);
          if (!s) return;
          s.revision += 1;
          s.save?.edit(value);
          this.options.onChange(path, value);
        },
        onLink: this.options.onLink,
        completions: () =>
          this.options.vault.entries.filter((e) => e.kind === "note").map((e) => e.path),
        asset: async (target) => {
          const r = resolveLink(
            path,
            target,
            this.options.vault.entries.map((e) => e.path),
            "embed",
          );
          return r.kind === "note" ? this.options.vault.asset(r.path) : undefined;
        },
      });
      session = {
        path,
        host,
        editor,
        save: undefined,
        status: needsRecoveryReview
          ? {
              kind: "conflict",
              message: "디스크 파일이 변경되었습니다. 복구본과 디스크 버전을 검토하세요.",
              current: snapshot,
            }
          : { kind: "saved" },
        snapshot,
        revision: 0,
        recovery: needsRecoveryReview ? draft : undefined,
      };
      this.items.set(path, session);
      const saveSnapshot =
        needsRecoveryReview && draft
          ? { content: snapshot.content, fingerprint: draft.baseFingerprint }
          : snapshot;
      this.attachSave(session, saveSnapshot);
      if (content !== snapshot.content) {
        session.revision += 1;
        session.save?.edit(content);
        this.options.onChange(path, content);
        if (needsRecoveryReview) {
          session.status = {
            kind: "conflict",
            message: "디스크 파일이 변경되었습니다. 복구본과 디스크 버전을 검토하세요.",
            current: snapshot,
          };
          this.options.onStatus();
        }
      }
    }
    if (token !== this.generation) return false;
    for (const s of this.items.values()) s.host.hidden = s.path !== path;
    this.active = path;
    session.editor.setMode(this.mode);
    session.editor.focus();
    return true;
  }
  private attachSave(session: Session, snapshot: FileSnapshot) {
    const vault = this.options.vault;
    if (vault.kind === "readonly") return;
    session.save = createAutosave({
      vault,
      path: session.path,
      snapshot,
      onStatus: (status) => {
        session.status = status;
        this.options.onStatus();
      },
    });
  }
  async flush(): Promise<boolean> {
    let saved = true;
    for (const s of this.items.values()) {
      if (s.save) {
        if (!(await s.save.flush())) saved = false;
      } else if (s.status.kind !== "saved") saved = false;
    }
    return saved;
  }
  async close(path: string): Promise<boolean> {
    const s = this.items.get(path);
    if (!s) return true;
    if (!s.save && s.status.kind !== "saved") return false;
    if (s.save && !(await s.save.flush())) return false;
    s.save?.dispose();
    s.editor.destroy();
    s.host.remove();
    this.items.delete(path);
    if (this.active === path) this.active = "";
    return true;
  }
  setMode(mode: EditorMode) {
    this.mode = mode;
    this.current()?.editor.setMode(mode);
  }
  pending() {
    return [...this.items.values()].some((s) => s.status.kind !== "saved");
  }
  async reload(path: string) {
    const s = this.items.get(path);
    if (!s) return;
    const revision = s.revision;
    const snapshot = await this.options.vault.read(path);
    if (this.items.get(path) !== s || s.revision !== revision) return false;
    s.save?.dispose();
    s.editor.setDocument(snapshot.content, path);
    s.snapshot = snapshot;
    s.status = { kind: "saved" };
    this.attachSave(s, snapshot);
    if (s.recovery) await discardSpecificDraft(s.recovery);
    else await discardDraft(this.options.vault.id, path);
    s.recovery = undefined;
    this.options.onChange(path, snapshot.content);
    this.options.onStatus();
    return true;
  }
  async acceptLocal(session: Session): Promise<boolean> {
    const vault = this.options.vault;
    if (vault.kind === "readonly") return false;
    const release = this.hold();
    try {
      const fresh = await vault.read(session.path);
      const current = session.editor.getContent();
      session.save?.dispose();
      session.snapshot = fresh;
      session.status = { kind: "saved" };
      this.attachSave(session, fresh);
      session.revision += 1;
      session.save?.edit(current);
      if (!(await session.save?.flush())) return false;
      if (session.recovery) await discardSpecificDraft(session.recovery);
      session.recovery = undefined;
      return true;
    } finally {
      release();
    }
  }
  saveDialog() {
    const s =
      [...this.items.values()].find(
        (x) => x.status.kind === "conflict" || x.status.kind === "error",
      ) ?? this.current();
    showSaveDialog(s, {
      reload: (path) => this.reload(path),
      acceptLocal: (session) => this.acceptLocal(session),
    });
  }
  destroy() {
    this.generation++;
    for (const s of this.items.values()) {
      s.save?.dispose();
      s.editor.destroy();
      s.host.remove();
    }
    this.items.clear();
  }
}
