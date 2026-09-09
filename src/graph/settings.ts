import { z } from "zod";
import type { ColorGroup } from "./filter";

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const group = z.object({ query: z.string().trim().min(1).max(80), color });
export const graphSettingsSchema = z.object({
  depth: z.number().int().min(1).max(5).default(2),
  showTags: z.boolean().default(true),
  showAssets: z.boolean().default(true),
  showMissing: z.boolean().default(true),
  showOrphans: z.boolean().default(true),
  arrows: z.boolean().default(true),
  labelThreshold: z.number().min(0).max(2).default(0.7),
  nodeScale: z.number().min(0.5).max(2).default(1),
  edgeWidth: z.number().min(0.5).max(3).default(1),
  center: z.number().min(0).max(1).default(0.08),
  repel: z.number().min(10).max(800).default(260),
  linkStrength: z.number().min(0).max(1).default(0.3),
  linkDistance: z.number().min(20).max(400).default(100),
  groups: z.array(group).max(12).default([]),
});
export type GraphSettings = z.infer<typeof graphSettingsSchema>;

export const defaultGraphSettings: GraphSettings = graphSettingsSchema.parse({});
const storageKey = "md-web-editor.graph-settings.v1";

export function readGraphSettings(): GraphSettings {
  try {
    const raw = localStorage.getItem(storageKey);
    return graphSettingsSchema.parse(raw ? JSON.parse(raw) : {});
  } catch {
    return defaultGraphSettings;
  }
}

export function saveGraphSettings(settings: GraphSettings): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(graphSettingsSchema.parse(settings)));
    return true;
  } catch {
    return false;
  }
}

export function replaceGroups(
  settings: GraphSettings,
  groups: readonly ColorGroup[],
): GraphSettings {
  const result = graphSettingsSchema.safeParse({ ...settings, groups });
  return result.success ? result.data : settings;
}
