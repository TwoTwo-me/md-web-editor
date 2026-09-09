import { describe, expect, it } from "vitest";
import { indexDocument, markdownContext, resolveLink } from "../src/editor/markdown";

describe("Markdown document indexing", () => {
  it("indexes supported links and headings while excluding fenced code", () => {
    const index = indexDocument(
      `# Café\n[[folder/한글|별칭]] and [reference][r] #tag\n\n[r]: ../two.md\n\n\`\`\`md\n[[ignored]] #nope\n\`\`\``,
    );
    expect(index.headings).toEqual([{ level: 1, text: "Café", line: 1, id: "café" }]);
    expect(index.links).toEqual([
      { target: "folder/한글", label: "별칭", kind: "wiki" },
      { target: "../two.md", label: "reference", kind: "markdown" },
    ]);
    expect(index.tags).toEqual(["tag"]);
  });
});

describe("vault link resolution", () => {
  const paths = ["one.md", "folder/two.markdown", "a/same.md", "b/same.md", "한글.md"];

  it("uses the documented wiki and Markdown lookup ordering", () => {
    expect(resolveLink("folder/current.md", "two", paths, "wiki")).toEqual({
      kind: "note",
      path: "folder/two.markdown",
      anchor: "",
    });
    expect(resolveLink("folder/current.md", "../one", paths, "markdown")).toEqual({
      kind: "note",
      path: "one.md",
      anchor: "",
    });
    expect(resolveLink("folder/current.md", "%ED%95%9C%EA%B8%80#title", paths, "wiki")).toEqual({
      kind: "note",
      path: "한글.md",
      anchor: "title",
    });
    expect(resolveLink("folder/current.md", "same", paths, "wiki")).toEqual({
      kind: "ambiguous",
      paths: ["a/same.md", "b/same.md"],
    });
  });

  it("blocks URLs and vault traversal", () => {
    expect(resolveLink("folder/current.md", "../../escape", paths)).toEqual({ kind: "blocked" });
    expect(resolveLink("folder/current.md", "//tracker.invalid/pixel", paths)).toEqual({
      kind: "blocked",
    });
    expect(resolveLink("folder/current.md", "javascript:alert(1)", paths)).toEqual({
      kind: "blocked",
    });
    expect(resolveLink("folder/current.md", "%68ttps%3A%2F%2Ftracker.invalid", paths)).toEqual({
      kind: "external",
      url: "https://tracker.invalid/",
    });
  });
});

describe("Markdown parser context", () => {
  it("records parsed indented footnotes and excludes fenced lookalikes", () => {
    const content = "note[^1]\n\n   [^1]: definition\n\n```md\n[^2]: fake\n```";
    const context = markdownContext(content);
    expect(context.footnotes.get("1")).toBe(content.indexOf("[^1]: definition"));
    expect(context.footnotes.has("2")).toBe(false);
  });
});
