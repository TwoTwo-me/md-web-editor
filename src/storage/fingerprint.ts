import type { FileSnapshot } from "../core/types";
import { VaultError } from "./errors";

export const MAX_NOTE_BYTES = 10 * 1024 * 1024;
export const MAX_ASSET_BYTES = 20 * 1024 * 1024;

export async function snapshot(content: string): Promise<FileSnapshot> {
  return { content, fingerprint: await fingerprint(content) };
}

export async function fingerprint(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function assertSize(size: number, maximum: number, label: string): void {
  if (size > maximum) {
    throw new VaultError(
      "io",
      `${label} exceeds the ${Math.floor(maximum / 1024 / 1024)} MiB limit.`,
    );
  }
}
