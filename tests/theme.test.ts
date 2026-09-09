// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThemeDefinition } from "../src/ui/theme";
import {
  applyCustomTheme,
  getCustomTheme,
  getPreferences,
  initializeTheme,
  parseTheme,
  resetCustomTheme,
  updatePreferences,
} from "../src/ui/theme";

const theme: ThemeDefinition = {
  version: 1,
  name: "Test theme",
  dark: {
    bg: "#010203",
    panel: "#040506",
    rail: "#070809",
    elevated: "#0a0b0c",
    hover: "#0d0e0f",
    border: "#101112",
    text: "#131415",
    muted: "#161718",
    accent: "#191a1b",
    accentSoft: "#1c1d1e",
    success: "#1f2021",
    warning: "#222324",
    danger: "#252627",
    graphEdge: "#28292a",
  },
  light: {
    bg: "#313233",
    panel: "#343536",
    rail: "#373839",
    elevated: "#3a3b3c",
    hover: "#3d3e3f",
    border: "#404142",
    text: "#434445",
    muted: "#464748",
    accent: "#494a4b",
    accentSoft: "#4c4d4e",
    success: "#4f5051",
    warning: "#525354",
    danger: "#555657",
    graphEdge: "#58595a",
  },
};

describe("theme and preferences boundaries", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("style");
    vi.restoreAllMocks();
  });

  afterEach(() => vi.restoreAllMocks());

  it("returns defaults when stored preferences are malformed", () => {
    localStorage.setItem("md-web-editor:preferences", '{"fontSize":99,"unknown":true}');

    const preferences = getPreferences();

    expect(preferences).toEqual({
      appearance: "system",
      fontSize: 16,
      lineWidth: 740,
      prefixEscape: true,
      prefixControlSpace: true,
    });
  });

  it("rejects unknown keys and CSS or URL payloads in theme colors", () => {
    const result = parseTheme({
      ...theme,
      dark: { ...theme.dark, bg: "url(https://example.test/x)" },
      injected: "body { color: red }",
    });

    expect(result).toBeUndefined();
  });

  it("accepts only a complete version one hex theme and applies known variables", () => {
    expect(parseTheme(theme)).toEqual(theme);
    expect(applyCustomTheme(theme)).toBe(true);
    initializeTheme();

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--bg")).toBe("#010203");
    expect(document.documentElement.style.getPropertyValue("--editor-font-size")).toBe("16px");
    expect(getCustomTheme()?.name).toBe("Test theme");
  });

  it("persists bounded preferences and emits one update event", () => {
    const listener = vi.fn();
    document.addEventListener("preferences-changed", listener);

    const next = updatePreferences({ appearance: "dark", fontSize: 24, lineWidth: 1100 });

    expect(next.appearance).toBe("dark");
    expect(getPreferences().lineWidth).toBe(1100);
    expect(document.documentElement.style.getPropertyValue("--editor-width")).toBe("1100px");
    expect(listener).toHaveBeenCalledTimes(1);
    document.removeEventListener("preferences-changed", listener);
  });

  it("survives a browser storage error while retaining the built in theme", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(getPreferences().fontSize).toBe(16);
    initializeTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(getCustomTheme()).toBeUndefined();
    resetCustomTheme();
  });
});
