// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../src/editor/markdown";

describe("Markdown reading surface", () => {
  it("removes active HTML and network-capable resources", () => {
    const root = document.createElement("article");
    let linkCalls = 0;
    const release = renderMarkdown(
      `<script>alert(1)</script><img src="https://tracker.invalid/a.png" onerror="alert(1)"><iframe src="/leak"></iframe><a href="javascript:alert(1)" ping="/beacon">bad</a>\n\n[[page|Wiki]] note[^1]\n\n[^1]: footnote`,
      {
        source: "note.md",
        root,
        asset: async () => undefined,
        onLink: () => {
          linkCalls += 1;
        },
      },
    );
    expect(root.querySelector("script, iframe")).toBeNull();
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector("[data-md-href=page]")?.textContent).toBe("Wiki");
    expect(root.querySelector(".footnotes")?.textContent).toContain("footnote");
    expect(root.innerHTML).not.toMatch(/onerror|javascript:|ping=/iu);
    release();
    root.querySelector<HTMLElement>("[data-md-href=page]")?.click();
    expect(linkCalls).toBe(0);
  });

  it("makes standard Markdown links inert and invokes the local callback", () => {
    const root = document.createElement("article");
    const calls: string[] = [];
    const release = renderMarkdown("[Next](연결/다음%20노트.md#연결)", {
      source: "note.md",
      root,
      asset: async () => undefined,
      onLink: (target) => calls.push(target),
    });
    const link = root.querySelector<HTMLElement>("[data-md-href]");
    expect(link?.getAttribute("href")).toBeNull();
    const target = link?.getAttribute("data-md-href");
    expect(target).toContain("%20");
    link?.click();
    expect(calls).toEqual([target]);
    release();
  });

  it("keeps footnote navigation inside the rendered document", () => {
    const root = document.createElement("article");
    const calls: string[] = [];
    const release = renderMarkdown("note[^1]\n\n[^1]: definition", {
      source: "note.md",
      root,
      asset: async () => undefined,
      onLink: (target) => calls.push(target),
    });
    const destination = root.querySelector<HTMLElement>("#fn1");
    let scrolled = false;
    Object.defineProperty(destination ?? root, "scrollIntoView", {
      value: () => {
        scrolled = true;
      },
    });
    root.querySelector<HTMLElement>("[data-md-href='#fn1']")?.click();
    expect(scrolled).toBe(true);
    expect(calls).toEqual([]);
    release();
  });
});
