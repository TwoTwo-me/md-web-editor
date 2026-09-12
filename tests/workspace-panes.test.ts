// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorOptions, NoteEditor, WritableVault } from "../src/core/types";
import type { CreateGraphOptions } from "../src/graph/graph";

const graphs = vi.hoisted(() => new Map<HTMLElement, CreateGraphOptions>());
vi.mock("../src/graph/graph", () => ({
  createGraph: (options: CreateGraphOptions) => {
    graphs.set(options.parent, options);
    options.parent.append(document.createElement("svg"));
    return { update: vi.fn(), setLocal: vi.fn(), destroy: () => graphs.delete(options.parent) };
  },
}));
vi.mock("../src/editor/editor", () => ({
  createEditor: (options: EditorOptions): NoteEditor => {
    const input = document.createElement("textarea");
    input.value = options.content;
    options.parent.append(input);
    input.addEventListener("input", () => options.onChange(input.value));
    return {
      getContent: () => input.value,
      setDocument: (text) => {
        input.value = text;
      },
      syncContent: (text) => {
        input.value = text;
      },
      setMode: (mode) => {
        input.dataset["mode"] = mode;
      },
      setReadonly: (value) => {
        input.readOnly = value;
      },
      focus: () => input.focus(),
      goToLine: vi.fn(),
      format: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      find: vi.fn(),
      destroy: () => input.remove(),
    };
  },
}));

import { Workspace } from "../src/core/workspace";
import { readStored, useMemoryStoreForTesting } from "../src/storage/browser-store";
import { createShell } from "../src/ui/shell";

let restoreStore: () => void;
let app: Workspace;
let defer: string | undefined;
let release: (() => void) | undefined;
const contents = new Map<string, string>();

beforeEach(async () => {
  document.body.replaceChildren();
  graphs.clear();
  defer = undefined;
  release = undefined;
  contents.clear();
  contents.set("a.md", "# A\n[[b]]");
  contents.set("b.md", "# B\n[[c]]");
  contents.set("c.md", "# C");
  restoreStore = useMemoryStoreForTesting();
  const vault: WritableVault = {
    id: "pane-fixture",
    name: "pane fixture",
    kind: "demo",
    entries: [...contents.keys()].map((path) => ({ path, kind: "note", modified: 1 })),
    read: async (path) => {
      if (path === defer)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      const content = contents.get(path) ?? "";
      return { content, fingerprint: content };
    },
    write: async (path, content) => {
      contents.set(path, content);
      return { content, fingerprint: content };
    },
    create: async (path, content) => {
      contents.set(path, content);
      return { content, fingerprint: content };
    },
    asset: async () => undefined,
    refresh: async () => undefined,
    close: () => undefined,
  };
  app = new Workspace(createShell(document.body));
  await app.setVault(vault);
});
afterEach(async () => {
  await app.sessions?.flush();
  app.panes.reset();
  app.sessions?.destroy();
  restoreStore();
});

describe("workspace split routing", () => {
  it("moves the graph beside the editor without replacing its host, then collapses on close", async () => {
    const group = app.panes.layout.activeGroup;
    const editor = app.editor();
    app.showGraph();
    const graph = app.panes.layout.activeTab();
    if (!graph) throw new Error("graph missing");
    const host = app.panes.graphs.get(graph.id)?.host;
    app.panes.move(graph.id, { group, position: "right" });
    expect(app.panes.layout.groups()).toHaveLength(2);
    expect(app.panes.graphs.get(graph.id)?.host).toBe(host);
    expect(document.querySelectorAll(".document-host:not([hidden])")).toHaveLength(1);
    expect(host?.hidden).toBe(false);
    await app.closeTab();
    expect(app.panes.layout.groups()).toHaveLength(1);
    expect(app.editor()).toBe(editor);
    expect(graphs.size).toBe(0);
  });

  it("uses the note group for graph navigation while keeping graph visible", async () => {
    const left = app.panes.layout.activeGroup;
    app.panes.graphRight();
    const right = app.panes.layout.activeGroup;
    const graph = app.panes.layout.group(right)?.active;
    const callback = [...graphs.values()][0];
    callback?.onOpen("b.md");
    await vi.waitFor(() => expect(app.sessions?.active).toBe("b.md"));
    expect(app.panes.layout.activeGroup).toBe(left);
    expect(app.panes.layout.group(right)?.active).toBe(graph);
    expect(document.querySelectorAll(".graph-host:not([hidden])")).toHaveLength(1);
  });

  it("keeps document content shared but view modes independent", async () => {
    const first = app.panes.layout.activeTab();
    if (!first) throw new Error("note missing");
    await app.panes.duplicate(first.id, "right");
    const second = app.panes.layout.activeTab();
    if (!second) throw new Error("duplicate missing");
    app.panes.mode(first.id, "source");
    app.panes.mode(second.id, "reading");
    const one = app.sessions?.views.get(first.id);
    const two = app.sessions?.views.get(second.id);
    const input = one?.host.querySelector("textarea");
    if (!input) throw new Error("editor missing");
    input.value = "shared change";
    input.dispatchEvent(new Event("input"));
    expect(two?.editor.getContent()).toBe("shared change");
    expect(one?.mode).toBe("source");
    expect(two?.mode).toBe("reading");
    expect(app.sessions?.items.size).toBe(1);
    await app.sessions?.flush();
    expect(contents.get("a.md")).toBe("shared change");
  });

  it("scopes concurrent open requests to their originating groups", async () => {
    const first = app.panes.layout.activeTab();
    if (!first) throw new Error("note missing");
    const left = app.panes.layout.activeGroup;
    await app.panes.duplicate(first.id, "right");
    const right = app.panes.layout.activeGroup;
    defer = "b.md";
    const slow = app.open("b.md", left);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    await app.open("c.md", right);
    release?.();
    await slow;
    const leftTab = app.panes.layout.group(left)?.active;
    const rightTab = app.panes.layout.group(right)?.active;
    expect(leftTab && app.panes.layout.tabs.get(leftTab)).toHaveProperty("path", "b.md");
    expect(rightTab && app.panes.layout.tabs.get(rightTab)).toHaveProperty("path", "c.md");
  });

  it("does not let a superseded open replace the chosen tab", async () => {
    defer = "b.md";
    const slow = app.open("b.md");
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    await app.open("c.md");
    release?.();
    await slow;
    expect(app.panes.layout.activeTab()).toHaveProperty("path", "c.md");
    expect(app.sessions?.active).toBe("c.md");
  });

  it("restores the layout only after reopening its vault", async () => {
    app.panes.graphRight();
    const root = app.panes.layout.root;
    if (root.kind !== "split" || !app.vault) throw new Error("split missing");
    app.panes.layout.setRatio(root.id, 0.65);
    app.panes.changed();
    app.panes.persistence.flush();
    await vi.waitFor(async () =>
      expect(await readStored("vaults", "layout:pane-fixture")).toBeDefined(),
    );
    await app.setVault(app.vault);
    expect(app.panes.layout.root).toHaveProperty("ratio", 0.65);
    expect(app.panes.layout.groups()).toHaveLength(2);
    expect(app.panes.graphs.size).toBe(1);
    expect(app.sessions?.views.size).toBe(1);
    expect(document.querySelectorAll("[role=tab]")).toHaveLength(2);
  });
});
