import { readStored, writeStored } from "../storage/browser-store";
import type { PaneLayout } from "./pane-layout";

export class PanePersistence {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending:
    | { readonly key: string; readonly value: ReturnType<PaneLayout["snapshot"]> }
    | undefined;
  private writes: Promise<void> = Promise.resolve();
  constructor(private readonly report: (cause: unknown) => void) {}

  load(vaultId: string) {
    return readStored("vaults", `layout:${vaultId}`);
  }
  schedule(vaultId: string, layout: PaneLayout) {
    this.pending = { key: `layout:${vaultId}`, value: layout.snapshot() };
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 300);
  }
  flush() {
    clearTimeout(this.timer);
    const pending = this.pending;
    this.pending = undefined;
    if (!pending) return;
    this.writes = this.writes
      .then(() => writeStored("vaults", pending.key, pending.value))
      .catch(this.report);
  }
}
