const svgNamespace = "http://www.w3.org/2000/svg";

export function svgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(svgNamespace, tag);
}

export type GraphCanvas = {
  readonly svg: SVGSVGElement;
  readonly viewport: SVGGElement;
  readonly edgeLayer: SVGGElement;
  readonly nodeLayer: SVGGElement;
};

export function createGraphCanvas(): GraphCanvas {
  const svg = svgElement("svg");
  svg.classList.add("graph-canvas");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "노트를 드래그하고 마우스 휠로 확대할 수 있는 그래프입니다. 키보드에서는 표시된 노트 목록을 사용하세요.",
  );
  const defs = svgElement("defs");
  const marker = svgElement("marker");
  marker.id = "graph-arrow";
  marker.setAttribute("viewBox", "0 -5 10 10");
  marker.setAttribute("refX", "14");
  marker.setAttribute("refY", "0");
  marker.setAttribute("markerWidth", "5");
  marker.setAttribute("markerHeight", "5");
  marker.setAttribute("orient", "auto");
  const arrow = svgElement("path");
  arrow.setAttribute("d", "M0,-5L10,0L0,5");
  arrow.setAttribute("fill", "var(--graph-edge)");
  marker.append(arrow);
  defs.append(marker);
  const viewport = svgElement("g");
  const edgeLayer = svgElement("g");
  const nodeLayer = svgElement("g");
  viewport.append(edgeLayer, nodeLayer);
  svg.append(defs, viewport);
  return { svg, viewport, edgeLayer, nodeLayer };
}
