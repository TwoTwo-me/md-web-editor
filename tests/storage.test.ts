import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FileSnapshot, VaultEntry, WritableVault } from "../src/core/types";
import { createAutosave, type SaveStatus } from "../src/storage/autosave";
import { readStored, useMemoryStoreForTesting } from "../src/storage/browser-store";
import { VaultError } from "../src/storage/errors";
import { snapshot } from "../src/storage/fingerprint";
import {
  discardDraft,
  discardSpecificDraft,
  listDrafts,
  readDraft,
  writeDraft,
} from "../src/storage/journal";
import { importPath, normalizePath } from "../src/storage/paths";
import { createDemoVault } from "../src/storage/vault";

let restoreStore: (() => void) | undefined;

beforeEach(() => {
  restoreStore = useMemoryStoreForTesting();
});

afterEach(() => {
  restoreStore?.();
  restoreStore = undefined;
});

class DelayedVault implements WritableVault {
  readonly kind = "demo" as const;
  readonly name = "test";
  readonly entries: readonly VaultEntry[] = [];
  readonly writes: { readonly content: string; readonly expected: string }[] = [];
  private resolver: ((value: FileSnapshot) => void) | undefined;

  constructor(
    readonly id: string,
    private content: string,
  ) {}

  async read(_path: string): Promise<FileSnapshot> {
    return snapshot(this.content);
  }
  async asset(_path: string): Promise<Blob | undefined> {
    return undefined;
  }
  async refresh(): Promise<void> {}
  close(): void {}

  write(_path: string, content: string, expected: string): Promise<FileSnapshot> {
    this.writes.push({ content, expected });
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  async create(_path: string, _content: string): Promise<FileSnapshot> {
    throw new VaultError("io", "unused");
  }

  async release(): Promise<void> {
    const resolve = this.resolver;
    const write = this.writes.at(-1);
    if (!resolve || !write) throw new VaultError("io", "No save is waiting.");
    this.content = write.content;
    resolve(await snapshot(write.content));
  }
}

class ConflictVault implements WritableVault {
  readonly kind = "demo" as const;
  readonly name = "test";
  readonly entries: readonly VaultEntry[] = [];

  constructor(
    readonly id: string,
    private readonly disk: FileSnapshot,
  ) {}

  async read(_path: string): Promise<FileSnapshot> {
    return this.disk;
  }
  async asset(_path: string): Promise<Blob | undefined> {
    return undefined;
  }
  async refresh(): Promise<void> {}
  close(): void {}
  async create(_path: string, _content: string): Promise<FileSnapshot> {
    throw new VaultError("io", "unused");
  }
  async write(_path: string, _content: string, _expected: string): Promise<FileSnapshot> {
    throw new VaultError("conflict", "Outside edit", this.disk);
  }
}

describe("vault paths", () => {
  it("does not claim persistence when IndexedDB is unavailable", async () => {
    restoreStore?.();
    restoreStore = undefined;
    await expect(readStored("drafts", "missing")).rejects.toMatchObject({ code: "io" });
  });

  it("keeps paths inside the vault and rejects protected OS names", () => {
    expect(() => normalizePath("../secret.md")).toThrow(VaultError);
    expect(() => normalizePath("notes/.git/config.md")).toThrow(VaultError);
    expect(() => normalizePath("notes/CON.md")).toThrow(VaultError);
    expect(normalizePath("notes\\서울.md")).toBe("notes/서울.md");
    expect(normalizePath("notes/e\u0301.md")).toBe("notes/e\u0301.md");
    expect(importPath("Notebook/.git/config")).toBeUndefined();
    expect(importPath("Notebook/notes/entry.md")).toBe("notes/entry.md");
  });

  it("keeps a writable demo notebook across reopened adapters", async () => {
    const first = await createDemoVault();
    expect(first.entries).toHaveLength(9);
    const opened = await first.read("Writing/Small rituals.md");
    await first.write("Writing/Small rituals.md", "# Kept note", opened.fingerprint);

    const reopened = await createDemoVault();
    await expect(reopened.read("Writing/Small rituals.md")).resolves.toMatchObject({
      content: "# Kept note",
    });
  });
});

describe("autosave", () => {
  it("never marks a newer edit saved after an older write completes", async () => {
    const initial = await snapshot("one");
    const vault = new DelayedVault("race-vault", "one");
    const statuses: SaveStatus[] = [];
    const autosave = createAutosave({
      vault,
      path: "note.md",
      snapshot: initial,
      onStatus: (status) => statuses.push(status),
    });

    autosave.edit("two");
    const first = autosave.flush();
    await vi.waitFor(() => expect(vault.writes).toHaveLength(1));
    autosave.edit("three");
    await vault.release();
    await vi.waitFor(() => expect(vault.writes).toHaveLength(2));
    await expect(readDraft(vault.id, "note.md")).resolves.toMatchObject({
      content: "three",
      baseFingerprint: (await snapshot("two")).fingerprint,
      revision: 2,
    });
    await vault.release();
    await expect(first).resolves.toBe(true);
    expect(autosave.getContent()).toBe("three");
    expect(statuses.at(-1)?.kind).toBe("saved");
    expect(vault.writes).toHaveLength(2);
    expect(vault.writes[1]?.expected).toBe((await snapshot("two")).fingerprint);
  });

  it("retains the local journal and reports the disk snapshot on conflict", async () => {
    const initial = await snapshot("local base");
    const disk = await snapshot("outside edit");
    const vault = new ConflictVault("conflict-vault", disk);
    const statuses: SaveStatus[] = [];
    const autosave = createAutosave({
      vault,
      path: "note.md",
      snapshot: initial,
      onStatus: (status) => statuses.push(status),
    });

    autosave.edit("local draft");
    await expect(autosave.flush()).resolves.toBe(false);

    await expect(readDraft(vault.id, "note.md")).resolves.toMatchObject({ content: "local draft" });
    expect(statuses.at(-1)).toEqual({ kind: "conflict", message: "Outside edit", current: disk });
  });

  it("journals later recovery edits while a stale fingerprint prevents disk overwrite", async () => {
    const stale = await snapshot("old disk");
    const disk = await snapshot("new disk");
    const vault = new ConflictVault("recovery-conflict-vault", disk);
    const autosave = createAutosave({
      vault,
      path: "note.md",
      snapshot: { content: disk.content, fingerprint: stale.fingerprint },
      onStatus: () => undefined,
    });

    autosave.edit("latest recovery edit");

    await expect(autosave.flush()).resolves.toBe(false);
    await expect(readDraft(vault.id, "note.md")).resolves.toMatchObject({
      content: "latest recovery edit",
      baseFingerprint: stale.fingerprint,
    });
    await expect(vault.read("note.md")).resolves.toEqual(disk);
  });

  it("leaves recovery content for the session dialog to choose", async () => {
    const initial = await snapshot("base");
    const vault = new DelayedVault("recovery-vault", "base");
    await writeDraft({
      vaultId: vault.id,
      path: "note.md",
      content: "recovered",
      baseFingerprint: initial.fingerprint,
      revision: 4,
      savedAt: 1,
    });
    const onStatus = vi.fn<(status: SaveStatus) => void>();
    const autosave = createAutosave({ vault, path: "note.md", snapshot: initial, onStatus });

    expect(autosave.getContent()).toBe("base");
    expect(onStatus).not.toHaveBeenCalled();
    await expect(readDraft(vault.id, "note.md")).resolves.toMatchObject({ content: "recovered" });
    autosave.dispose();
  });

  it("keeps independent drafts from separate browser sessions", async () => {
    await writeDraft({
      vaultId: "shared-vault",
      path: "note.md",
      content: "first tab",
      baseFingerprint: "base",
      revision: 1,
      savedAt: 1,
      sessionId: "tab-a",
    });
    await writeDraft({
      vaultId: "shared-vault",
      path: "note.md",
      content: "second tab",
      baseFingerprint: "base",
      revision: 1,
      savedAt: 2,
      sessionId: "tab-b",
    });
    await writeDraft({
      vaultId: "shared-vault",
      path: "note.md",
      content: "current tab",
      baseFingerprint: "base",
      revision: 1,
      savedAt: 3,
    });

    const drafts = await listDrafts("shared-vault");
    expect(drafts).toHaveLength(3);
    await expect(readDraft("shared-vault", "note.md")).resolves.toMatchObject({
      content: "current tab",
    });
    const first = drafts.find((draft) => draft.sessionId === "tab-a");
    if (!first) throw new VaultError("io", "Test draft is missing.");
    await discardDraft("shared-vault", "note.md");
    await expect(listDrafts("shared-vault")).resolves.toHaveLength(2);
    await discardSpecificDraft(first);
    await expect(listDrafts("shared-vault")).resolves.toMatchObject([
      expect.objectContaining({ sessionId: "tab-b", content: "second tab" }),
    ]);
  });
});
