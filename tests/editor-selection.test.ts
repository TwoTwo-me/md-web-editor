// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createEditor } from "../src/editor/editor";

describe("live multi-block selection", () => {
  it("exposes every selected source block without modifying content", () => {
    const parent = document.createElement("main");
    const content = "# First\n\n**Second**\n\n- Third";
    const editor = createEditor({
      parent,
      content,
      readonly: false,
      mode: "live",
      path: "note.md",
      onChange: () => undefined,
      onLink: () => undefined,
      asset: async () => undefined,
      completions: () => [],
    });
    const input = parent.querySelector<HTMLElement>(".cm-content");
    expect(parent.querySelectorAll(".cm-md-preview").length).toBeGreaterThan(0);
    input?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "a",
        code: "KeyA",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(parent.querySelectorAll(".cm-md-preview")).toHaveLength(0);
    expect(editor.getContent()).toBe(content);
    editor.destroy();
  });
});
