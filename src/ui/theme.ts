const PREFERENCES_KEY = "md-web-editor:preferences";
const CUSTOM_THEME_KEY = "md-web-editor:custom-theme";

import type { Appearance, ColorKey, Preferences, ThemeDefinition } from "./theme-schema";
import {
  BUILTIN_THEME,
  COLOR_KEYS,
  DEFAULT_PREFERENCES,
  preferencesSchema,
  themeSchema,
} from "./theme-schema";

export type { Preferences, ThemeDefinition } from "./theme-schema";

let appliedCustomKeys: readonly string[] = [];
let systemQuery: MediaQueryList | undefined;

function storageRead(key: string): string | undefined {
  try {
    return window.localStorage.getItem(key) ?? undefined;
  } catch (cause: unknown) {
    if (cause instanceof Error || cause instanceof DOMException) return undefined;
    throw cause;
  }
}

function storageWrite(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (cause: unknown) {
    if (cause instanceof Error || cause instanceof DOMException) return false;
    throw cause;
  }
}

function storageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (cause: unknown) {
    if (cause instanceof Error || cause instanceof DOMException) return;
    throw cause;
  }
}

function parseJson(value: string | undefined): unknown {
  if (value === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed;
  } catch (cause: unknown) {
    if (cause instanceof SyntaxError) return undefined;
    throw cause;
  }
}

function readPreferences(): Preferences {
  const parsed = preferencesSchema.safeParse(parseJson(storageRead(PREFERENCES_KEY)));
  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
}

function readCustomTheme(): ThemeDefinition | undefined {
  const parsed = themeSchema.safeParse(parseJson(storageRead(CUSTOM_THEME_KEY)));
  return parsed.success ? parsed.data : undefined;
}

function resolvedAppearance(appearance: Appearance): "dark" | "light" {
  if (appearance !== "system") return appearance;
  try {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    return query ? (query.matches ? "dark" : "light") : "dark";
  } catch (cause: unknown) {
    if (cause instanceof Error || cause instanceof DOMException) return "dark";
    throw cause;
  }
}

function cssName(key: ColorKey): string {
  return `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

function clearCustomColors(root: HTMLElement): void {
  for (const key of appliedCustomKeys) root.style.removeProperty(key);
  appliedCustomKeys = [];
}

function applyColors(
  root: HTMLElement,
  theme: ThemeDefinition,
  appearance: "dark" | "light",
): void {
  clearCustomColors(root);
  const colors = theme[appearance];
  appliedCustomKeys = COLOR_KEYS.map(cssName);
  for (const key of COLOR_KEYS) root.style.setProperty(cssName(key), colors[key]);
}

function applyCurrentTheme(): void {
  const root = document.documentElement;
  const preferences = readPreferences();
  const appearance = resolvedAppearance(preferences.appearance);
  root.setAttribute("data-theme", appearance);
  root.style.setProperty("--editor-font-size", `${preferences.fontSize}px`);
  root.style.setProperty("--editor-width", `${preferences.lineWidth}px`);
  const customTheme = readCustomTheme();
  if (customTheme) applyColors(root, customTheme, appearance);
  else clearCustomColors(root);
}

function watchSystemAppearance(): void {
  systemQuery?.removeEventListener("change", applyCurrentTheme);
  systemQuery = undefined;
  try {
    systemQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    systemQuery?.addEventListener("change", applyCurrentTheme);
  } catch (cause: unknown) {
    if (!(cause instanceof Error || cause instanceof DOMException)) throw cause;
  }
}

export function getPreferences(): Preferences {
  return readPreferences();
}

export type PreferenceUpdateResult = Readonly<{ preferences: Preferences; saved: boolean }>;

export function updatePreferencesWithStatus(
  patch: Readonly<Partial<Preferences>>,
): PreferenceUpdateResult {
  const result = preferencesSchema.safeParse({ ...readPreferences(), ...patch });
  if (!result.success) return { preferences: readPreferences(), saved: false };
  const preferences = result.data;
  const saved = storageWrite(PREFERENCES_KEY, JSON.stringify(preferences));
  if (!saved) return { preferences: readPreferences(), saved: false };
  applyCurrentTheme();
  document.dispatchEvent(new CustomEvent("preferences-changed", { detail: preferences }));
  return { preferences, saved: true };
}

export function updatePreferences(patch: Readonly<Partial<Preferences>>): Preferences {
  return updatePreferencesWithStatus(patch).preferences;
}

export function initializeTheme(): void {
  watchSystemAppearance();
  applyCurrentTheme();
}

export function toggleTheme(): void {
  const next = resolvedAppearance(readPreferences().appearance) === "dark" ? "light" : "dark";
  updatePreferences({ appearance: next });
}

export function parseTheme(value: unknown): ThemeDefinition | undefined {
  const parsed = themeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export async function readThemeFile(file: File): Promise<ThemeDefinition | undefined> {
  return parseTheme(parseJson(await file.text()));
}

export function previewTheme(value: unknown): boolean {
  const theme = parseTheme(value);
  if (!theme) return false;
  const appearance = resolvedAppearance(readPreferences().appearance);
  applyColors(document.documentElement, theme, appearance);
  return true;
}

export function applyCustomTheme(value: unknown): boolean {
  const theme = parseTheme(value);
  if (!theme) return false;
  if (!storageWrite(CUSTOM_THEME_KEY, JSON.stringify(theme))) return false;
  applyCurrentTheme();
  return true;
}

export function resetCustomTheme(): void {
  storageRemove(CUSTOM_THEME_KEY);
  applyCurrentTheme();
}

export function getCustomTheme(): ThemeDefinition | undefined {
  return readCustomTheme();
}

export function getCurrentTheme(): ThemeDefinition {
  return readCustomTheme() ?? BUILTIN_THEME;
}

export { showSettings } from "./settings";
