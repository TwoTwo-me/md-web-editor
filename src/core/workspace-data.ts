import type { Note, Vault } from "./types";

export async function readWorkspaceNotes(vault: Vault): Promise<Map<string, Note>> {
  const notes = new Map<string, Note>();
  for (const entry of vault.entries) {
    if (entry.kind !== "note") continue;
    const snapshot = await vault.read(entry.path);
    notes.set(entry.path, { path: entry.path, content: snapshot.content });
  }
  return notes;
}

export function initialWorkspaceNote(notes: ReadonlyMap<string, Note>): Note | undefined {
  return (
    [...notes.values()].find((note) => /환영|welcome|시작/iu.test(note.path)) ??
    notes.values().next().value
  );
}
