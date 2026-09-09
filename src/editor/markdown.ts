import type { Env } from "markdown-it";
import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import type { DocumentIndex, NoteLink, ResolvedLink } from "../core/types";

type Heading = DocumentIndex["headings"][number];
const md = new MarkdownIt({ html: true, linkify: false, typographer: false });

function enableFootnotes(): void {
  const plugin: unknown = footnote;
  if (typeof plugin === "function") plugin(md);
}

enableFootnotes();
export type MarkdownContext = {
  readonly environment: Env;
  readonly footnotes: ReadonlyMap<string, number>;
};

export function markdownContext(content: string): MarkdownContext {
  const parsed: Env = {};
  md.parse(content, parsed);
  const environment: Env = parsed.references ? { references: parsed.references } : {};
  const footnotes = new Map<string, number>();
  for (const match of content.matchAll(/^\[\^([^\]\n]+)\]:/gmu)) {
    footnotes.set(match[1] ?? "", match.index ?? 0);
  }
  return { environment, footnotes };
}

export const markdownHtml = (content: string, environment?: Env): string =>
  md.render(content, environment);

export function taskOffsets(content: string): readonly number[] {
  const offsets: number[] = [];
  const starts = [0];
  for (const match of content.matchAll(/\n/gu)) starts.push((match.index ?? 0) + 1);
  for (const token of md.parse(content, {})) {
    if (token.type !== "list_item_open" || token.map === null) continue;
    const line = token.map[0];
    if (line === undefined) continue;
    const start = starts[line];
    if (start === undefined) continue;
    const end = content.indexOf("\n", start);
    const text = content.slice(start, end < 0 ? content.length : end);
    const marker = /^(?:[ \t]*>\s*)*[ \t]*(?:[-+*]|\d+[.)])[ \t]+\[([ xX])\]/u.exec(text);
    if (marker) offsets.push(start + (marker[0]?.lastIndexOf("[") ?? 0) + 1);
  }
  return offsets;
}

function slug(text: string, counts: Map<string, number>): string {
  const base =
    text
      .normalize("NFKC")
      .trim()
      .toLocaleLowerCase()
      .replace(/\s+/gu, "-")
      .replace(/[^\p{L}\p{N}_-]/gu, "") || "section";
  const count = counts.get(base) ?? 0;
  counts.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

export function wikiParts(value: string): { readonly target: string; readonly label: string } {
  const [rawTarget = "", rawLabel] = value.split("|", 2);
  const target = rawTarget.trim();
  return { target, label: rawLabel?.trim() || target.replace(/^.*\//u, "").replace(/#.*/u, "") };
}

function addWikis(text: string, links: NoteLink[]): void {
  for (const match of text.matchAll(/(!)?\[\[([^\]\n]+)\]\]/gu)) {
    const parts = wikiParts(match[2] ?? "");
    if (parts.target)
      links.push({ target: parts.target, label: parts.label, kind: match[1] ? "embed" : "wiki" });
  }
}

export function indexDocument(content: string): DocumentIndex {
  const links: NoteLink[] = [];
  const tags = new Set<string>();
  const headings: Heading[] = [];
  const counts = new Map<string, number>();
  const tokens = md.parse(content, {});
  for (const token of tokens) {
    if (token.type === "heading_open") {
      const inline = tokens[tokens.indexOf(token) + 1];
      if (inline?.type === "inline") {
        const text =
          inline.children?.map((child) => String(child.content)).join("") ?? String(inline.content);
        headings.push({
          level: Number.parseInt(token.tag.slice(1), 10),
          text,
          line: (token.map?.[0] ?? 0) + 1,
          id: slug(text, counts),
        });
      }
      continue;
    }
    if (token.type !== "inline" || !token.children) continue;
    let markdownTarget = "";
    let markdownLabel = "";
    for (const child of token.children) {
      if (child.type === "link_open") {
        const target = child.attrGet("href");
        markdownTarget = target ? String(target) : "";
        markdownLabel = "";
      }
      if (child.type === "link_close" && markdownTarget) {
        links.push({ target: markdownTarget, label: markdownLabel, kind: "markdown" });
        markdownTarget = "";
      }
      if (child.type === "image") {
        const target = child.attrGet("src");
        if (target)
          links.push({ target: String(target), label: String(child.content), kind: "embed" });
      }
      if (child.type === "text") {
        const text = String(child.content);
        if (markdownTarget) markdownLabel += text;
        addWikis(text, links);
        for (const tag of text.matchAll(/(^|\s)#([\p{L}\p{N}_/-]+)/gu)) tags.add(tag[2] ?? "");
      }
    }
  }
  return { links, tags: [...tags].filter(Boolean), headings };
}

export function decoded(value: string): string | undefined {
  try {
    return decodeURIComponent(value).replace(/\\/gu, "/");
  } catch {
    return undefined;
  }
}

function splitTarget(target: string): { readonly path: string; readonly anchor: string } {
  const hash = target.indexOf("#");
  return hash < 0
    ? { path: target, anchor: "" }
    : { path: target.slice(0, hash), anchor: target.slice(hash + 1) };
}

export function safePath(path: string): string | undefined {
  const output: string[] = [];
  for (const piece of path.split("/")) {
    if (!piece || piece === ".") continue;
    if (piece === "..") {
      if (!output.pop()) return undefined;
      continue;
    }
    output.push(piece);
  }
  return output.join("/");
}

export function directory(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash + 1);
}

function candidates(path: string, paths: readonly string[]): readonly string[] {
  const exact = paths.filter((entry) => entry === path);
  if (exact.length) return exact;
  if (/\.(md|markdown)$/iu.test(path)) return [];
  return paths.filter(
    (entry) =>
      entry.toLocaleLowerCase() === `${path}.md`.toLocaleLowerCase() ||
      entry.toLocaleLowerCase() === `${path}.markdown`.toLocaleLowerCase(),
  );
}

function external(target: string): ResolvedLink | undefined {
  if (/^(https?|mailto):/iu.test(target)) {
    try {
      const url = new URL(target);
      if (!url.username && !url.password) return { kind: "external", url: url.href };
    } catch {
      return { kind: "blocked" };
    }
  }
  return undefined;
}

export function resolveLink(
  source: string,
  target: string,
  paths: readonly string[],
  kind: NoteLink["kind"] = "wiki",
): ResolvedLink {
  if (/^(?:\/\/|[a-z][a-z\d+.-]*:)/iu.test(target)) return external(target) ?? { kind: "blocked" };
  const decodedTarget = decoded(target);
  if (decodedTarget === undefined) return { kind: "blocked" };
  if (/^(?:\/\/|[a-z][a-z\d+.-]*:)/iu.test(decodedTarget))
    return external(decodedTarget) ?? { kind: "blocked" };
  const parts = splitTarget(decodedTarget);
  if (!parts.path) return { kind: "note", path: source, anchor: parts.anchor };
  const relative = safePath(`${directory(source)}${parts.path}`);
  if (relative === undefined) return { kind: "blocked" };
  const direct = safePath(parts.path);
  const directMatches = direct ? candidates(direct, paths) : [];
  const relativeMatches = candidates(relative, paths);
  const matches =
    kind === "wiki"
      ? directMatches.length
        ? directMatches
        : relativeMatches
      : relativeMatches.length
        ? relativeMatches
        : directMatches;
  if (matches.length === 1 && matches[0])
    return { kind: "note", path: matches[0], anchor: parts.anchor };
  if (matches.length > 1) return { kind: "ambiguous", paths: matches };
  const basename = (direct ?? relative).replace(/^.*\//u, "").replace(/\.(md|markdown)$/iu, "");
  const names = paths.filter(
    (entry) => entry.replace(/^.*\//u, "").replace(/\.(md|markdown)$/iu, "") === basename,
  );
  if (names.length === 1 && names[0]) return { kind: "note", path: names[0], anchor: parts.anchor };
  if (names.length > 1) return { kind: "ambiguous", paths: names };
  const missing =
    relative.endsWith(".md") || relative.endsWith(".markdown") ? relative : `${relative}.md`;
  return { kind: "missing", path: missing, anchor: parts.anchor };
}

export { renderMarkdown } from "./render";
