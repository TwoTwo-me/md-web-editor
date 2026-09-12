import { z } from "zod";

export const COLOR_KEYS = [
  "bg",
  "panel",
  "rail",
  "elevated",
  "hover",
  "border",
  "text",
  "muted",
  "accent",
  "accentSoft",
  "success",
  "warning",
  "danger",
  "graphEdge",
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];
export type Appearance = "system" | "dark" | "light";
export type Preferences = Readonly<{
  appearance: Appearance;
  fontSize: number;
  lineWidth: number;
  prefixEscape: boolean;
  prefixControlSpace: boolean;
  linkAllFiles: boolean;
}>;
export type ThemeDefinition = Readonly<{
  version: 1;
  name: string;
  dark: Readonly<Record<ColorKey, string>>;
  light: Readonly<Record<ColorKey, string>>;
}>;

export const preferencesSchema = z
  .object({
    appearance: z.enum(["system", "dark", "light"]).default("system"),
    fontSize: z.number().int().min(14).max(24).default(16),
    lineWidth: z.number().int().min(520).max(1100).default(740),
    prefixEscape: z.boolean().default(true),
    prefixControlSpace: z.boolean().default(true),
    linkAllFiles: z.boolean().default(false),
  })
  .strict();

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const colorsSchema = z
  .object({
    bg: hex,
    panel: hex,
    rail: hex,
    elevated: hex,
    hover: hex,
    border: hex,
    text: hex,
    muted: hex,
    accent: hex,
    accentSoft: hex,
    success: hex,
    warning: hex,
    danger: hex,
    graphEdge: hex,
  })
  .strict();

export const themeSchema = z
  .object({
    version: z.literal(1),
    name: z.string().min(1).max(80),
    dark: colorsSchema,
    light: colorsSchema,
  })
  .strict();

export const DEFAULT_PREFERENCES: Preferences = {
  appearance: "system",
  fontSize: 16,
  lineWidth: 740,
  prefixEscape: true,
  prefixControlSpace: true,
  linkAllFiles: false,
};

export const BUILTIN_THEME: ThemeDefinition = {
  version: 1,
  name: "md-web-editor",
  dark: {
    bg: "#19191c",
    panel: "#202024",
    rail: "#17171a",
    elevated: "#29292f",
    hover: "#2e2e35",
    border: "#35353e",
    text: "#e4e4eb",
    muted: "#a1a1b0",
    accent: "#b5a0ff",
    accentSoft: "#322a48",
    success: "#98ceae",
    warning: "#e8bc78",
    danger: "#f39a9a",
    graphEdge: "#555363",
  },
  light: {
    bg: "#ffffff",
    panel: "#f5f5f7",
    rail: "#ededf0",
    elevated: "#ffffff",
    hover: "#e8e8ed",
    border: "#dcdce3",
    text: "#292930",
    muted: "#656574",
    accent: "#7151c7",
    accentSoft: "#eee8fb",
    success: "#36734d",
    warning: "#855500",
    danger: "#ad3030",
    graphEdge: "#bab6c8",
  },
};

export type BundledThemeId = string;
export type BundledTheme = Readonly<{ id: BundledThemeId; theme: ThemeDefinition }>;
