import type { FileSnapshot, VaultEntry, WritableVault } from "../core/types";
import { readStored, writeStored } from "./browser-store";
import { VaultError } from "./errors";
import { snapshot } from "./fingerprint";
import { lock, parseDemo } from "./folder-helpers";
import { requireNotePath } from "./paths";

type DemoNotes = Record<string, string>;

export class DemoVault implements WritableVault {
  readonly kind = "demo" as const;
  readonly name = "Garden notebook";
  entries: readonly VaultEntry[] = [];

  constructor(
    readonly id: string,
    private notes: DemoNotes,
  ) {
    this.refreshEntries();
  }

  async read(path: string): Promise<FileSnapshot> {
    const notes = await this.load();
    const normalized = requireNotePath(path);
    const content = notes[normalized];
    if (content === undefined) throw new VaultError("missing", `No note exists at ${normalized}.`);
    return snapshot(content);
  }

  async asset(_path: string): Promise<Blob | undefined> {
    return undefined;
  }

  async refresh(): Promise<void> {
    await this.load();
    this.refreshEntries();
  }

  async write(path: string, content: string, expected: string): Promise<FileSnapshot> {
    const normalized = requireNotePath(path);
    return lock(`demo:${this.id}`, async () => {
      const notes = await this.load();
      const disk = notes[normalized];
      if (disk === undefined) throw new VaultError("missing", `No note exists at ${normalized}.`);
      const current = await snapshot(disk);
      if (current.fingerprint !== expected)
        throw new VaultError("conflict", "The demo note changed.", current);
      const next = { ...notes, [normalized]: content };
      await writeStored("demo", "notes", next);
      this.notes = next;
      this.refreshEntries();
      return snapshot(content);
    });
  }

  async create(path: string, content: string): Promise<FileSnapshot> {
    const normalized = requireNotePath(path);
    return lock(`demo:${this.id}`, async () => {
      const notes = await this.load();
      if (notes[normalized] !== undefined)
        throw new VaultError("exists", `A note already exists at ${normalized}.`);
      const next = { ...notes, [normalized]: content };
      await writeStored("demo", "notes", next);
      this.notes = next;
      this.refreshEntries();
      return snapshot(content);
    });
  }

  close(): void {}

  private async load(): Promise<DemoNotes> {
    const stored = parseDemo(await readStored("demo", "notes"));
    if (stored) this.notes = stored;
    return this.notes;
  }

  private refreshEntries(): void {
    this.entries = Object.keys(this.notes)
      .sort()
      .map((path) => ({ path, kind: "note", modified: 0 }));
  }
}
