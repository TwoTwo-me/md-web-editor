import type { GraphSettings } from "./settings";
import { replaceGroups } from "./settings";

export type SettingsPanel = { readonly root: HTMLElement; setSettings(value: GraphSettings): void };
const booleans = [
  ["태그", "showTags"],
  ["첨부 파일", "showAssets"],
  ["없는 링크", "showMissing"],
  ["고아 노트 표시", "showOrphans"],
  ["화살표", "arrows"],
] as const;
const ranges = [
  ["레이블 확대", "labelThreshold", 0, 2, 0.1],
  ["노드 크기", "nodeScale", 0.5, 2, 0.1],
  ["연결선 굵기", "edgeWidth", 0.5, 3, 0.1],
  ["중심", "center", 0, 1, 0.01],
  ["반발", "repel", 10, 800, 10],
  ["연결 강도", "linkStrength", 0, 1, 0.05],
  ["연결 거리", "linkDistance", 20, 400, 5],
] as const;
function section(title: string): HTMLDetailsElement {
  const root = document.createElement("details");
  const summary = document.createElement("summary");
  root.open = true;
  summary.textContent = title;
  root.append(summary);
  return root;
}
function field(label: string, input: HTMLElement): HTMLLabelElement {
  const root = document.createElement("label");
  const text = document.createElement("span");
  root.className = "graph-field";
  text.textContent = label;
  root.append(text, input);
  return root;
}

export function createSettingsPanel(
  initial: GraphSettings,
  onSettings: (value: GraphSettings) => void,
): SettingsPanel {
  let settings = initial;
  const root = document.createElement("aside");
  root.className = "graph-settings";
  root.setAttribute("aria-label", "그래프 설정");
  const apply = (next: GraphSettings) => {
    settings = next;
    onSettings(next);
  };
  const filters = section("필터");
  const display = section("표시");
  const physics = section("힘");
  for (const [label, key] of booleans) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = settings[key];
    input.setAttribute("data-setting", key);
    input.addEventListener("change", () => apply({ ...settings, [key]: input.checked }));
    (key === "arrows" ? display : filters).append(field(label, input));
  }
  for (const [label, key, min, max, step] of ranges) {
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(settings[key]);
    input.setAttribute("data-setting", key);
    input.addEventListener("input", () => apply({ ...settings, [key]: Number(input.value) }));
    (key === "labelThreshold" || key === "nodeScale" || key === "edgeWidth"
      ? display
      : physics
    ).append(field(label, input));
  }
  const groups = section("색상 그룹");
  const rows = document.createElement("div");
  rows.className = "graph-groups";
  const draw = () => {
    rows.replaceChildren(
      ...settings.groups.map((group, index) => {
        const row = document.createElement("div");
        row.className = "graph-group";
        const query = document.createElement("input");
        query.value = group.query;
        query.setAttribute("aria-label", "그룹 검색어");
        query.addEventListener("change", () =>
          apply(
            replaceGroups(
              settings,
              settings.groups.map((item, i) =>
                i === index ? { ...item, query: query.value } : item,
              ),
            ),
          ),
        );
        const color = document.createElement("input");
        color.type = "color";
        color.value = group.color;
        color.addEventListener("input", () =>
          apply(
            replaceGroups(
              settings,
              settings.groups.map((item, i) =>
                i === index ? { ...item, color: color.value } : item,
              ),
            ),
          ),
        );
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "button subtle";
        remove.textContent = "삭제";
        remove.addEventListener("click", () =>
          apply(
            replaceGroups(
              settings,
              settings.groups.filter((_, i) => i !== index),
            ),
          ),
        );
        row.append(query, color, remove);
        return row;
      }),
    );
  };
  const add = document.createElement("button");
  add.type = "button";
  add.className = "button subtle";
  add.textContent = "그룹 추가";
  add.addEventListener("click", () =>
    apply(replaceGroups(settings, [...settings.groups, { query: "#tag", color: "#b5a0ff" }])),
  );
  groups.append(rows, add);
  root.append(filters, display, physics, groups);
  draw();
  return {
    root,
    setSettings(value) {
      settings = value;
      const values: Readonly<Record<string, boolean | number>> = {
        showTags: value.showTags,
        showAssets: value.showAssets,
        showMissing: value.showMissing,
        showOrphans: value.showOrphans,
        arrows: value.arrows,
        labelThreshold: value.labelThreshold,
        nodeScale: value.nodeScale,
        edgeWidth: value.edgeWidth,
        center: value.center,
        repel: value.repel,
        linkStrength: value.linkStrength,
        linkDistance: value.linkDistance,
      };
      root.querySelectorAll<HTMLInputElement>("[data-setting]").forEach((input) => {
        const current = values[input.getAttribute("data-setting") ?? ""];
        if (typeof current === "boolean") input.checked = current;
        if (typeof current === "number") input.value = String(current);
      });
      draw();
    },
  };
}
