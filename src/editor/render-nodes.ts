import { wikiParts } from "./markdown";

function textNodes(root: HTMLElement): readonly Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    if (current instanceof Text && !current.parentElement?.closest("a, code, pre"))
      nodes.push(current);
  }
  return nodes;
}

export function wikiNodes(root: HTMLElement): void {
  for (const node of textNodes(root)) {
    if (!/!?\[\[[^\]\n]+\]\]/u.test(node.data)) continue;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const match of node.data.matchAll(/(!)?\[\[([^\]\n]+)\]\]/gu)) {
      const index = match.index ?? 0;
      fragment.append(node.data.slice(cursor, index));
      const parts = wikiParts(match[2] ?? "");
      const item = document.createElement(match[1] ? "img" : "a");
      if (item instanceof HTMLImageElement) {
        item.alt = parts.label;
        item.setAttribute("data-md-src", parts.target);
      } else {
        item.textContent = parts.label;
        item.setAttribute("data-md-href", parts.target);
        item.setAttribute("data-md-kind", "wiki");
      }
      fragment.append(item);
      cursor = index + (match[0]?.length ?? 0);
    }
    fragment.append(node.data.slice(cursor));
    node.replaceWith(fragment);
  }
}

export function footnoteNodes(root: HTMLElement, footnotes: ReadonlyMap<string, number>): void {
  for (const node of textNodes(root)) {
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let found = false;
    for (const match of node.data.matchAll(/\[\^([^\]\n]+)\]/gu)) {
      const id = match[1] ?? "";
      if (!footnotes.has(id)) continue;
      const index = match.index ?? 0;
      fragment.append(node.data.slice(cursor, index));
      const note = document.createElement("a");
      note.className = "footnote-ref";
      note.textContent = `[${id}]`;
      note.setAttribute("data-md-footnote", id);
      fragment.append(note);
      cursor = index + (match[0]?.length ?? 0);
      found = true;
    }
    if (found) {
      fragment.append(node.data.slice(cursor));
      node.replaceWith(fragment);
    }
  }
}
