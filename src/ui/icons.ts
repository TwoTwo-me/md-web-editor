const shapes: Readonly<Record<string, readonly string[]>> = {
  "♧": [
    "M12 5a2 2 0 1 0 0 .01",
    "M5 17a2 2 0 1 0 0 .01",
    "M19 17a2 2 0 1 0 0 .01",
    "M11 7 6 15M13 7l5 8M7 17h10",
  ],
  "▤": ["M5 3h10l4 4v14H5z", "M14 3v5h5M8 12h8M8 16h6"],
  "⌕": ["M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z", "m14.5 14.5 5 5"],
  "▦": ["M4 5h16v16H4z", "M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 17h2"],
  "⚙": [
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    "M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
  ],
  "◧": ["M3 4h18v16H3z", "M15 4v16"],
  "☰": ["M4 6h16M4 12h16M4 18h16"],
  "↻": ["M19 8a8 8 0 1 0 1 8", "M19 3v5h-5"],
  "↓": ["M12 3v13m-5-5 5 5 5-5", "M5 18v3h14v-3"],
  "◐": ["M12 3a9 9 0 1 0 0 18V3Z", "M12 3a9 9 0 0 1 0 18"],
  "+": ["M12 5v14M5 12h14"],
  "×": ["m6 6 12 12M6 18 18 6"],
  "⌘": [
    "M9 9h6v6H9z",
    "M9 9H6a3 3 0 1 1 3-3v3ZM15 9V6a3 3 0 1 1 3 3h-3ZM15 15h3a3 3 0 1 1-3 3v-3ZM9 15v3a3 3 0 1 1-3-3h3Z",
  ],
};
export function makeIcon(key: string): SVGSVGElement | HTMLSpanElement {
  const paths = shapes[key];
  if (!paths) {
    const text = document.createElement("span");
    text.textContent = key;
    text.className = "glyph";
    text.setAttribute("aria-hidden", "true");
    return text;
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}
