// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Vault, VaultEntry } from "../src/core/types";

vi.mock("../src/ui/attachment", () => ({ showAttachment: vi.fn(async () => undefined) }));

import { Workspace } from "../src/core/workspace";
import { followGraphNode } from "../src/core/workspace-operations";
import { showAttachment } from "../src/ui/attachment";
import { createShell } from "../src/ui/shell";
import { getPreferences, updatePreferences } from "../src/ui/theme";

const entries: readonly VaultEntry[] = [
  { path: "start.md", kind: "note", modified: 1 },
  { path: "docs/report.pdf", kind: "asset", modified: 1 },
];
function workspace(): Workspace {
  const vault: Vault = {
    id: "test:files",
    name: "test files",
    kind: "demo",
    write: async (_path, content) => ({ content, fingerprint: content }),
    create: async (_path, content) => ({ content, fingerprint: content }),
    entries,
    read: async () => ({ content: "", fingerprint: "empty" }),
    asset: async () => undefined,
    refresh: async () => undefined,
    close: () => undefined,
  };
  const app = new Workspace(createShell(document.body));
  app.vault = vault;
  app.notes.set("start.md", { path: "start.md", content: "[[/docs/report.pdf|report]]" });
  return app;
}

beforeEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("all-file navigation", () => {
  it("keeps all-file discovery disabled for existing preferences", () => {
    expect(getPreferences()).toHaveProperty("linkAllFiles", false);
  });

  it("persists the all-file discovery option", () => {
    updatePreferences({ linkAllFiles: true });
    expect(getPreferences()).toHaveProperty("linkAllFiles", true);
  });

  it("opens a root wiki attachment through the local file viewer", async () => {
    const app = workspace();
    await app.follow("/docs/report.pdf", "wiki");
    expect(showAttachment).toHaveBeenCalledWith(app.vault, "docs/report.pdf");
  });

  it("does not offer a new Markdown note for a missing binary target", async () => {
    const app = workspace();
    await app.follow("/docs/missing.pdf", "wiki");
    expect(document.querySelector("dialog")).toBeNull();
    expect(showAttachment).not.toHaveBeenCalled();
  });

  it("opens graph attachments through the same file viewer", async () => {
    const app = workspace();
    await followGraphNode(app, "docs/report.pdf");
    expect(showAttachment).toHaveBeenCalledWith(app.vault, "docs/report.pdf");
  });

  it("lists attachments only after enabling all-file discovery", () => {
    const app = workspace();
    app.render();
    expect(app.shell.tree.querySelector('[data-note-path="docs/report.pdf"]')).toBeNull();
    updatePreferences({ linkAllFiles: true });
    expect(app.shell.tree.querySelector('[data-note-path="docs/report.pdf"]')).not.toBeNull();
  });
});
