import type { SaveStatus } from "../storage/autosave";
import { type Draft, discardSpecificDraft, readDraft } from "../storage/journal";
import { offerRecovery } from "./session-recovery";
import type { FileSnapshot, Vault } from "./types";

export type LoadedDocument = {
  readonly content: string;
  readonly snapshot: FileSnapshot;
  readonly saveSnapshot: FileSnapshot;
  readonly status: SaveStatus;
  readonly recovery: Draft | undefined;
};

type LoadOptions = {
  readonly vault: Vault;
  readonly path: string;
  readonly isAlive: () => boolean;
};

export async function loadDocument(options: LoadOptions): Promise<LoadedDocument | undefined> {
  const snapshot = await options.vault.read(options.path);
  if (!options.isAlive()) return undefined;
  const draft = await readDraft(options.vault.id, options.path);
  if (!options.isAlive()) return undefined;
  if (!draft || draft.content === snapshot.content || options.vault.kind === "readonly")
    return fromDisk(snapshot);
  const recovered = await offerRecovery(
    options.path,
    draft.content,
    snapshot.content,
    draft.baseFingerprint !== snapshot.fingerprint,
  );
  if (!options.isAlive()) return undefined;
  if (recovered === "disk") {
    await discardSpecificDraft(draft);
    return fromDisk(snapshot);
  }
  return recovered === "recover" ? fromRecovery(snapshot, draft) : fromDisk(snapshot);
}

function fromDisk(snapshot: FileSnapshot): LoadedDocument {
  return {
    content: snapshot.content,
    snapshot,
    saveSnapshot: snapshot,
    status: { kind: "saved" },
    recovery: undefined,
  };
}

function fromRecovery(snapshot: FileSnapshot, recovery: Draft): LoadedDocument {
  const conflict = recovery.baseFingerprint !== snapshot.fingerprint;
  return {
    content: recovery.content,
    snapshot,
    saveSnapshot: conflict
      ? { content: snapshot.content, fingerprint: recovery.baseFingerprint }
      : snapshot,
    status: conflict
      ? {
          kind: "conflict",
          message: "디스크 파일이 변경되었습니다. 복구본과 디스크 버전을 검토하세요.",
          current: snapshot,
        }
      : { kind: "saved" },
    recovery,
  };
}
