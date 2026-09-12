function normalizedVaultPath(path: string): string | undefined {
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

function wikiLabel(path: string): string {
  const filename = path.replace(/^.*\//u, "");
  return filename.replace(/\.[^.]+$/u, "") || filename;
}

function validWikiLabel(label: string): boolean {
  return !/[[\]|]/u.test(label);
}

function encodeWikiPath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.replace(/[%#|[\]]/gu, encodeURIComponent))
    .join("/");
}

export type CanonicalWikiLinkOptions = {
  readonly anchor?: string | undefined;
  readonly label?: string | undefined;
};

export function canonicalWikiLinkContent(
  path: string,
  options: CanonicalWikiLinkOptions = {},
): string {
  const normalized = normalizedVaultPath(path);
  if (!normalized) return "";
  const label = options.label ?? wikiLabel(normalized);
  const alias = validWikiLabel(label) ? `|${label}` : "";
  return `/${encodeWikiPath(normalized)}${options.anchor ? `#${options.anchor}` : ""}${alias}`;
}

export function canonicalWikiLink(path: string): string {
  return `[[${canonicalWikiLinkContent(path)}]]`;
}
