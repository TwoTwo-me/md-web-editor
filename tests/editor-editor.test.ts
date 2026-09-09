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

  it("maps rendered task controls to actual task-list markers only", () => {
    const parent = document.createElement("main");
    const editor = createEditor({
      parent,
      content: "# Active\n\n- [ ] first\n- explanatory [ ] text\n- [ ] second",
      readonly: false,
      mode: "live",
      path: "note.md",
      onChange: () => undefined,
      onLink: () => undefined,
      asset: async () => undefined,
      completions: () => [],
    });
    parent.querySelectorAll<HTMLElement>(".task-checkbox")[1]?.click();
    expect(editor.getContent()).toContain("- [ ] first");
    expect(editor.getContent()).toContain("- explanatory [ ] text");
    expect(editor.getContent()).toContain("- [x] second");
    editor.destroy();
  });

  it("excludes fenced fake tasks and maps quote-prefixed task markers", () => {
    const parent = document.createElement("main");
    const editor = createEditor({
      parent,
      content:
        "# Active\n\n- [ ] first\n  ```\n  - [ ] fake\n  ```\n- [ ] second\n\n> - [ ] quoted",
      readonly: false,
      mode: "live",
      path: "note.md",
      onChange: () => undefined,
      onLink: () => undefined,
      asset: async () => undefined,
      completions: () => [],
    });
    const boxes = parent.querySelectorAll<HTMLElement>(".task-checkbox");
    boxes[1]?.click();
    boxes[2]?.click();
    expect(editor.getContent()).toContain("- [ ] fake");
    expect(editor.getContent()).toContain("- [x] second");
    expect(editor.getContent()).toContain("> - [x] quoted");
    editor.destroy();
  });

  it("keeps loose-list paragraphs while mapping the second task checkbox", () => {
    const parent = document.createElement("main");
    const editor = createEditor({
      parent,
      content: "# Active\n\n- [ ] first\n\n- [ ] second",
      readonly: false,
      mode: "live",
      path: "note.md",
      onChange: () => undefined,
      onLink: () => undefined,
      asset: async () => undefined,
      completions: () => [],
    });
    const boxes = parent.querySelectorAll<HTMLElement>(".task-checkbox");
    expect(boxes).toHaveLength(2);
    boxes[1]?.click();
    expect(editor.getContent()).toContain("- [ ] first\n\n- [x] second");
    editor.destroy();
  });

  it("maps a continuation-line task to its exact source marker", () => {
    const parent = document.createElement("main");
    const editor = createEditor({
      parent,
      content: "# Active\n\n-\n  [ ] continuation task",
      readonly: false,
      mode: "live",
      path: "note.md",
      onChange: () => undefined,
      onLink: () => undefined,
      asset: async () => undefined,
      completions: () => [],
    });
    parent.querySelector<HTMLElement>(".task-checkbox")?.click();
    expect(editor.getContent()).toContain("  [x] continuation task");
    editor.destroy();
  });

  it("maps a multiline task whose parsed inline text strips continuation indentation", () => {
    const parent = document.createElement("main");
    const editor = createEditor({
      parent,
      content: "# Active\n\n- [ ] task\n  continuation text",
      readonly: false,
      mode: "live",
      path: "note.md",
      onChange: () => undefined,
      onLink: () => undefined,
      asset: async () => undefined,
      completions: () => [],
    });
    parent.querySelector<HTMLElement>(".task-checkbox")?.click();
    expect(editor.getContent()).toContain("- [x] task\n  continuation text");
    editor.destroy();
  });

  it("retains inactive preview widgets while selection stays in one block", () => {
    const parent = document.createElement("main");
    let assetCalls = 0;
    const editor = createEditor({
      parent,
      content: "active\ncontinued\n\n![image](asset.png)",
      readonly: false,
      mode: "live",
      path: "note.md",
      onChange: () => undefined,
      onLink: () => undefined,
      asset: async () => {
        assetCalls += 1;
        return undefined;
      },
      completions: () => [],
    });
    editor.goToLine(2);
    expect(assetCalls).toBe(1);
    editor.destroy();
  });

  it("returns a plain rendered block to source editing on pointer selection", () => {
    const parent = document.createElement("main");
    const editor = createEditor({
      parent,
      content: "# Active\n\nplain prose",
      readonly: false,
      mode: "live",
      path: "note.md",
      onChange: () => undefined,
      onLink: () => undefined,
      asset: async () => undefined,
      completions: () => [],
    });
    const prose = parent.querySelector<HTMLElement>(".markdown-reading p");
    prose?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(parent.querySelector(".markdown-reading p")).toBeNull();
    editor.format("bold");
    expect(editor.getContent()).toContain("**");
    editor.destroy();
  });

  it("shares references and footnotes across inactive live-preview blocks", () => {
    const parent = document.createElement("main");
    const links: string[] = [];
    const editor = createEditor({
      parent,
      content:
        "# Active\n\n[reference][start]\n\n[start]: ../start.md\n\nfootnote[^1]\n\n[^1]: text",
      readonly: false,
      mode: "live",
      path: "folder/note.md",
      onChange: () => undefined,
      onLink: (target) => links.push(target),
      asset: async () => undefined,
      completions: () => [],
    });
    const link = parent.querySelector<HTMLElement>("[data-md-href='../start.md']");
    expect(link?.getAttribute("href")).toBeNull();
    link?.click();
    expect(links).toEqual(["../start.md"]);
    expect(parent.querySelectorAll(".footnotes")).toHaveLength(0);
    expect(parent.querySelector(".footnote-ref")?.textContent).toBe("[1]");
    editor.destroy();
  });

  it("opens an indented live footnote definition at its source marker", () => {
    const parent = document.createElement("main");
    const editor = createEditor({
      parent,
      content: "# Active\n\nfootnote[^1]\n\n   [^1]: definition",
      readonly: false,
      mode: "live",
      path: "note.md",
      onChange: () => undefined,
      onLink: () => undefined,
      asset: async () => undefined,
      completions: () => [],
    });
    parent.querySelector<HTMLElement>("[data-md-footnote='1']")?.click();
    expect(parent.querySelector(".cm-content")?.textContent).toContain("[^1]: definition");
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
