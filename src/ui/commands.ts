import { hasDialog, openDialog } from "./dialog";
import { button, element, labeledInput } from "./dom";
import { getPreferences } from "./theme";
export type Command = { readonly key: string; readonly label: string; readonly run: () => void };
export function physicalKey(event: Pick<KeyboardEvent, "code" | "key">): string {
  if (event.code.startsWith("Key")) return event.code.slice(3).toLowerCase();
  if (event.code.startsWith("Digit")) return event.code.slice(5);
  const special: Readonly<Record<string, string>> = {
    Slash: "/",
    Comma: ",",
    BracketLeft: "[",
    BracketRight: "]",
  };
  return special[event.code] ?? event.key.toLowerCase();
}
export function installCommands(commands: readonly Command[]) {
  let hud: HTMLElement | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    hud?.remove();
    hud = undefined;
    clearTimeout(timeout);
  };
  const start = () => {
    cancel();
    hud = element("section", "prefix-hud");
    hud.setAttribute("aria-label", "명령 키");
    hud.append(element("h2", "", "다음 키를 누르세요"));
    const grid = element("div", "prefix-grid");
    for (const command of commands) {
      const row = button("", () => {
        cancel();
        command.run();
      });
      row.append(element("kbd", "", command.key.toUpperCase()), element("span", "", command.label));
      grid.append(row);
    }
    hud.append(grid);
    document.body.append(hud);
    timeout = setTimeout(cancel, 2000);
  };
  const onKey = (event: KeyboardEvent) => {
    if (
      event.isComposing ||
      event.keyCode === 229 ||
      event.getModifierState("AltGraph") ||
      event.repeat ||
      event.defaultPrevented
    )
      return;
    if (hasDialog()) {
      cancel();
      return;
    }
    if (hud) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
        return;
      }
      const command = commands.find((item) => item.key === physicalKey(event));
      cancel();
      if (command && !event.metaKey && !event.altKey && !event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();
        command.run();
      }
      return;
    }
    const preferences = getPreferences();
    const escapeTrigger = event.key === "Escape" && preferences.prefixEscape;
    const controlSpace =
      event.ctrlKey &&
      event.code === "Space" &&
      !event.altKey &&
      !event.metaKey &&
      preferences.prefixControlSpace;
    if (escapeTrigger || controlSpace) {
      event.preventDefault();
      start();
    }
  };
  const onControlPrefix = (event: KeyboardEvent) => {
    if (
      event.ctrlKey &&
      event.code === "Space" &&
      !event.altKey &&
      !event.metaKey &&
      !event.isComposing &&
      event.keyCode !== 229 &&
      !event.repeat &&
      !event.getModifierState("AltGraph") &&
      !hasDialog() &&
      getPreferences().prefixControlSpace
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (hud) cancel();
      else start();
    }
  };
  document.addEventListener("keydown", onControlPrefix, true);
  document.addEventListener("keydown", onKey);
  return {
    destroy: () => {
      cancel();
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keydown", onControlPrefix, true);
    },
    start,
    cancel,
    palette: () =>
      showChoices(
        "명령 팔레트",
        commands.map((c) => ({ label: c.label, hint: `${c.key.toUpperCase()}`, run: c.run })),
      ),
  };
}
export type Choice = {
  readonly label: string;
  readonly detail?: string;
  readonly hint?: string;
  readonly run: () => void;
};
export function showChoices(title: string, choices: readonly Choice[]) {
  const { dialog, body } = openDialog(title);
  const { wrap, input } = labeledInput("검색", "", "이름이나 명령을 입력하세요…");
  const list = element("div", "command-list");
  let selected = 0;
  let shown: readonly Choice[] = [];
  const render = () => {
    const query = input.value.toLocaleLowerCase();
    shown = choices
      .filter((c) => `${c.label} ${c.detail ?? ""}`.toLocaleLowerCase().includes(query))
      .slice(0, 80);
    selected = Math.min(selected, Math.max(0, shown.length - 1));
    list.replaceChildren();
    shown.forEach((choice, index) => {
      const row = button(
        "",
        () => {
          dialog.close();
          choice.run();
        },
        `command-row ${index === selected ? "selected" : ""}`,
      );
      const text = element("span", "", choice.label);
      if (choice.detail) text.append(element("small", "search-snippet", choice.detail));
      row.append(text);
      if (choice.hint) row.append(element("kbd", "", choice.hint));
      list.append(row);
    });
    if (!shown.length) list.append(element("p", "empty-message", "일치하는 항목이 없습니다."));
  };
  input.addEventListener("input", () => {
    selected = 0;
    render();
  });
  input.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      selected =
        (selected + (event.key === "ArrowDown" ? 1 : -1) + shown.length) %
        Math.max(1, shown.length);
      render();
      list.children.item(selected)?.scrollIntoView({ block: "nearest" });
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const choice = shown[selected];
      if (choice) {
        dialog.close();
        choice.run();
      }
    }
  });
  body.append(wrap, list);
  render();
  input.focus();
}
