import type { FileSnapshot } from "../core/types";

export const vaultErrorCodes = [
  "conflict",
  "permission",
  "readonly",
  "invalid-path",
  "exists",
  "missing",
  "io",
] as const;

export type VaultErrorCode = (typeof vaultErrorCodes)[number];

export class VaultError extends Error {
  readonly name = "VaultError";

  constructor(
    readonly code: VaultErrorCode,
    message: string,
    readonly current?: FileSnapshot,
  ) {
    super(message);
  }
}

export function vaultError(error: unknown, fallback: string): VaultError {
  if (error instanceof VaultError) return error;
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return new VaultError("permission", "Directory permission was denied.");
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return new VaultError("missing", "The requested file no longer exists.");
  }
  return new VaultError("io", fallback);
}
