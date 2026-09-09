// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installCommands, physicalKey } from "../src/ui/commands";

let cleanup = () => undefined;
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.useRealTimers();
});
function press(key: string, code: string, extra: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    code,
    bubbles: true,
    cancelable: true,
    ...extra,
  });
  document.dispatchEvent(event);
  return event;
}
describe("prefix commands", () => {
  it("uses physical keys on Korean layouts and cancels without eating normal text", () => {
    const run = vi.fn();
    const controller = installCommands([{ key: "g", label: "Graph", run }]);
    cleanup = () => {
      controller.destroy();
      return undefined;
    };
    expect(press("g", "KeyG").defaultPrevented).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(press("Escape", "Escape").defaultPrevented).toBe(true);
    expect(press("ㅎ", "KeyG").defaultPrevented).toBe(true);
    expect(run).toHaveBeenCalledOnce();
    press("Escape", "Escape");
    expect(press("a", "KeyA").defaultPrevented).toBe(false);
  });
  it("does not consume IME, repeats or handled keys, and expires prefix", () => {
    const run = vi.fn();
    const c = installCommands([{ key: "g", label: "Graph", run }]);
    cleanup = () => {
      c.destroy();
      return undefined;
    };
    expect(press("Escape", "Escape", { isComposing: true }).defaultPrevented).toBe(false);
    expect(press("Escape", "Escape", { repeat: true }).defaultPrevented).toBe(false);
    press("Escape", "Escape");
    vi.advanceTimersByTime(2001);
    press("g", "KeyG");
    expect(run).not.toHaveBeenCalled();
    press("Escape", "Escape");
    press("Escape", "Escape");
    press("g", "KeyG");
    expect(run).not.toHaveBeenCalled();
  });
  it("supports the alternative prefix and punctuation commands", () => {
    const run = vi.fn();
    const c = installCommands([{ key: ",", label: "Settings", run }]);
    cleanup = () => {
      c.destroy();
      return undefined;
    };
    expect(press(" ", "Space", { ctrlKey: true }).defaultPrevented).toBe(true);
    press(",", "Comma");
    expect(run).toHaveBeenCalledOnce();
    expect(physicalKey({ key: "{", code: "BracketLeft" })).toBe("[");
  });
});
it("captures Control Space before editor completion bindings consume it", () => {
  const run = vi.fn();
  const c = installCommands([{ key: "n", label: "New", run }]);
  cleanup = () => {
    c.destroy();
    return undefined;
  };
  const editor = document.createElement("div");
  document.body.append(editor);
  const completion = vi.fn((event: KeyboardEvent) => event.preventDefault());
  editor.addEventListener("keydown", completion);
  editor.dispatchEvent(
    new KeyboardEvent("keydown", {
      code: "Space",
      key: " ",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(completion).not.toHaveBeenCalled();
  press("n", "KeyN");
  expect(run).toHaveBeenCalledOnce();
});
