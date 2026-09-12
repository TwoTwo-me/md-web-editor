import type { Autosave, SaveStatus } from "../storage/autosave";
import type { Draft } from "../storage/journal";
import type { FileSnapshot, NoteEditor, NoteLink, Vault } from "./types";

export type Session = {
  readonly path: string;
  editor: NoteEditor;
  host: HTMLElement;
  save: Autosave | undefined;
  status: SaveStatus;
  snapshot: FileSnapshot;
  revision: number;
  recovery: Draft | undefined;
  content: string;
};

export type SessionOptions = {
  readonly vault: Vault;
  readonly parent: HTMLElement;
  readonly onChange: (path: string, content: string) => void;
  readonly onStatus: () => void;
  readonly onLink: (target: string, kind?: NoteLink["kind"]) => void;
  readonly onFocus?: (id: string) => void;
};
