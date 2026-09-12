import { button, element } from "./dom";
export type ExplorerFile = { readonly path: string; readonly content?: string };
export function renderExplorer(
  parent: HTMLElement,
  notes: readonly ExplorerFile[],
  active: string,
  query: string,
  onOpen: (path: string) => void,
) {
  const expanded = new Set(
    [...parent.querySelectorAll("details[open]")].map((d) => d.getAttribute("data-path")),
  );
  const initialized = parent.childElementCount > 0;
  parent.replaceChildren();
  const needle = query.trim().toLocaleLowerCase();
  const filtered = notes.filter(
    (n) =>
      !needle ||
      n.path.toLocaleLowerCase().includes(needle) ||
      n.content?.toLocaleLowerCase().includes(needle),
  );
  const folders = new Map<string, HTMLElement>();
  folders.set("", parent);
  for (const note of [...filtered].sort((a, b) => a.path.localeCompare(b.path))) {
    const parts = note.path.split("/");
    let folder = "";
    let container = parent;
    for (const segment of parts.slice(0, -1)) {
      const next = folder ? `${folder}/${segment}` : segment;
      let child = folders.get(next);
      if (!child) {
        const details = element("details");
        details.dataset["path"] = next;
        details.open =
          Boolean(needle) || !initialized || expanded.has(next) || active.startsWith(`${next}/`);
        const summary = element("summary", "file-row folder-row");
        summary.append(
          element("span", "folder-arrow", "›"),
          element("span", "file-label", segment),
        );
        child = element("div", "folder-items");
        details.append(summary, child);
        container.append(details);
        folders.set(next, child);
      }
      container = child;
      folder = next;
    }
    const row = button(
      "",
      () => onOpen(note.path),
      `file-row ${active === note.path ? "active" : ""}`,
    );
    row.title = note.path;
    row.dataset["notePath"] = note.path;
    row.setAttribute("aria-current", String(active === note.path));
    row.append(
      element("span", "file-glyph", "▤"),
      element("span", "file-label", (parts.at(-1) ?? note.path).replace(/\.md$|\.markdown$/i, "")),
    );
    container.append(row);
  }
  if (!filtered.length)
    parent.append(
      element(
        "p",
        "empty-message",
        needle ? "검색 결과가 없습니다." : "아직 노트가 없습니다. 새 노트를 만들어 보세요.",
      ),
    );
}
