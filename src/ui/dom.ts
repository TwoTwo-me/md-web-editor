import { makeIcon } from "./icons";
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}
export function button(label: string, action: () => void, className = "button"): HTMLButtonElement {
  const node = element("button", className, label);
  node.type = "button";
  node.addEventListener("click", action);
  return node;
}
export function iconButton(label: string, icon: string, action: () => void): HTMLButtonElement {
  const node = button("", action, "icon-button");
  node.title = label;
  node.setAttribute("aria-label", label);
  node.append(makeIcon(icon));
  return node;
}
export function labeledInput(label: string, value = "", placeholder = "") {
  const wrap = element("label", "field");
  const input = element("input");
  input.value = value;
  input.placeholder = placeholder;
  wrap.append(element("span", "field-label", label), input);
  return { wrap, input };
}
export function download(name: string, content: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = element("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
