import type { Note, NoteLink } from "../core/types";
import { indexDocument, resolveLink } from "../editor/markdown";
import { button, element } from "./dom";
export function renderInspector(
  parent: HTMLElement,
  notes: readonly Note[],
  active: string,
  onOpen: (path: string, kind?: NoteLink["kind"]) => void,
  onLine: (line: number) => void,
) {
  parent.replaceChildren(element("div", "inspector-header", "연결과 개요"));
  const note = notes.find((n) => n.path === active);
  if (!note) {
    const section = element("section", "inspector-section");
    section.append(element("p", "", "노트를 열면 연결된 생각과 문서의 개요가 이곳에 표시됩니다."));
    parent.append(section);
    return;
  }
  const index = indexDocument(note.content);
  const paths = notes.map((n) => n.path);
  const section = (title: string, count: number) => {
    const s = element("section", "inspector-section");
    const h = element("h3", "", title);
    h.append(element("span", "section-count", String(count)));
    s.append(h);
    parent.append(s);
    return s;
  };
  const backlinks = notes.filter(
    (n) =>
      n.path !== active &&
      indexDocument(n.content).links.some((l) => {
        const r = resolveLink(n.path, l.target, paths, l.kind);
        return r.kind === "note" && r.path === active;
      }),
  );
  const back = section("백링크", backlinks.length);
  for (const n of backlinks)
    back.append(button(n.path.replace(/\.md$|\.markdown$/i, ""), () => onOpen(n.path), "file-row"));
  if (!backlinks.length) back.append(element("p", "", "이 노트를 가리키는 링크가 없습니다."));
  const outgoing = section("나가는 링크", index.links.length);
  for (const link of index.links)
    outgoing.append(
      button(link.label || link.target, () => onOpen(link.target, link.kind), "file-row"),
    );
  if (!index.links.length)
    outgoing.append(element("p", "", "[[노트 이름]]으로 생각을 연결하세요."));
  const outline = section("개요", index.headings.length);
  for (const h of index.headings) {
    const row = button(h.text, () => onLine(h.line), "file-row outline-row");
    row.style.paddingInlineStart = `${(h.level - 1) * 8 + 8}px`;
    outline.append(row);
  }
  if (!index.headings.length) outline.append(element("p", "", "제목을 추가하면 개요가 생깁니다."));
  if (index.tags.length) {
    const tags = section("태그", index.tags.length);
    for (const tag of index.tags) tags.append(element("span", "tag", `#${tag.replace(/^#/, "")}`));
  }
}
