import { createAutosave, type SaveStatus } from "../storage/autosave";
import { discardDraft, discardSpecificDraft } from "../storage/journal";
import type { Session, SessionOptions } from "./session-model";
import { discardSavedRecovery } from "./session-recovery";
import type { SessionView } from "./session-view";
import type { FileSnapshot } from "./types";

export type SessionPersistenceOptions = {
  readonly options: SessionOptions;
  readonly items: Map<string, Session>;
  readonly views: ReadonlyMap<string, SessionView>;
  readonly hold: () => () => void;
};

export class SessionPersistence {
  constructor(private readonly values: SessionPersistenceOptions) {}

  change(id: string, content: string): void {
    const view = this.values.views.get(id);
    const session = view ? this.values.items.get(view.path) : undefined;
    if (!session || session.content === content) return;
    session.content = content;
    session.revision += 1;
    session.save?.edit(content);
    for (const sibling of this.viewsFor(session.path))
      if (sibling.id !== id && sibling.editor.getContent() !== content)
        sibling.editor.syncContent(content);
    this.values.options.onChange(session.path, content);
  }

  attach(session: Session, snapshot: FileSnapshot): void {
    if (this.values.options.vault.kind === "readonly") return;
    session.save = createAutosave({
      vault: this.values.options.vault,
      path: session.path,
      snapshot,
      onStatus: (status) => this.saveStatus(session, status),
    });
  }

  async reload(path: string): Promise<boolean | undefined> {
    const session = this.values.items.get(path);
    if (!session) return undefined;
    const revision = session.revision;
    const snapshot = await this.values.options.vault.read(path);
    if (this.values.items.get(path) !== session || session.revision !== revision) return false;
    session.save?.dispose();
    session.content = snapshot.content;
    for (const view of this.viewsFor(path)) view.editor.setDocument(snapshot.content, path);
    session.snapshot = snapshot;
    session.status = { kind: "saved" };
    this.attach(session, snapshot);
    if (session.recovery) await discardSpecificDraft(session.recovery);
    else await discardDraft(this.values.options.vault.id, path);
    session.recovery = undefined;
    this.values.options.onChange(path, snapshot.content);
    this.values.options.onStatus();
    return true;
  }

  async acceptLocal(session: Session): Promise<boolean> {
    if (this.values.options.vault.kind === "readonly") return false;
    const release = this.values.hold();
    try {
      const fresh = await this.values.options.vault.read(session.path);
      session.save?.dispose();
      session.snapshot = fresh;
      session.status = { kind: "saved" };
      this.attach(session, fresh);
      session.revision += 1;
      session.save?.edit(session.content);
      if (!(await session.save?.flush())) return false;
      if (session.recovery) await discardSpecificDraft(session.recovery);
      session.recovery = undefined;
      return true;
    } finally {
      release();
    }
  }

  private saveStatus(session: Session, status: SaveStatus): void {
    if (this.values.items.get(session.path) !== session) return;
    session.status = status;
    if (status.kind === "saved") void discardSavedRecovery(session).catch(() => undefined);
    this.values.options.onStatus();
  }

  private viewsFor(path: string): SessionView[] {
    return [...this.values.views.values()].filter((view) => view.path === path);
  }
}
