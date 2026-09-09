// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createEditor } from "../src/editor/editor";

describe("CodeMirror editor modes", () => {
  it("preserves source, exposes source affordances, and does not save document replacement", () => {
    const parent = document.createElement("main");
    const changes: string[] = [];
    const editor = createEditor({
      parent,
      content: "# First\ntext",
      readonly: false,
      mode: "source",
      path: "first.md",
      onChange: (content) => changes.push(content),
      onLink: () => undefined,
      asset: async () => undefined,
      completions: () => ["first.md"],
    });
    expect(parent.querySelector(".cm-gutters")).not.toBeNull();
    editor.setDocument("exact **source**", "second.md");
    expect(editor.getContent()).toBe("exact **source**");
    expect(changes).toEqual([]);
    editor.setMode("reading");
    expect(parent.querySelector(".markdown-reading")?.textContent).toContain("exact source");
    editor.destroy();
  });

  it("formats the command-palette link action as an exact wiki link", () => {
    const parent = document.createElement("main");
    const editor = createEditor({
      parent,
      content: "",
      readonly: false,
      mode: "source",
      path: "note.md",
      onChange: () => undefined,
      onLink: () => undefined,
      asset: async () => undefined,
      completions: () => ["target.md"],
    });
    editor.format("link");
    expect(editor.getContent()).toBe("[[]]");
    editor.destroy();
  });

  it("renders inactive blocks and persists an interactive task toggle", () => {
    const parent = document.createElement("main");
    const links: string[] = [];
    const editor = createEditor({
      parent,
      content: "# Active\n\n**bold** [[target|Target]]\n\n- [ ] task",
      readonly: false,
      mode: "live",
      path: "note.md",
      onChange: () => undefined,
      onLink: (target) => links.push(target),
      asset: async () => undefined,
      completions: () => [],
    });
    expect(parent.querySelector(".markdown-reading strong")?.textContent).toBe("bold");
    parent.querySelector<HTMLElement>("[data-md-href=target]")?.click();
    expect(links).toEqual(["target"]);
    parent.querySelector<HTMLElement>(".task-checkbox")?.click();
    expect(editor.getContent()).toContain("[x] task");
    editor.destroy();
  });

  it("never applies programmatic formatting while readonly", () => {
    const parent = document.createElement("main");
    const editor = createEditor({
      parent,
      content: "plain",
      readonly: true,
      mode: "source",
      path: "note.md",
      onChange: () => undefined,
      onLink: () => undefined,
      asset: async () => undefined,
      completions: () => [],
    });
    editor.format("link");
    editor.undo();
    editor.redo();
    expect(editor.getContent()).toBe("plain");
    editor.destroy();
  });
});
