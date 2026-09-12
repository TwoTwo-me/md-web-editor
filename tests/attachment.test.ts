// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Vault } from "../src/core/types";
import { MAX_ASSET_BYTES } from "../src/storage/fingerprint";
import { showAttachment } from "../src/ui/attachment";

type AttachmentVault = Vault & {
  readonly files: ReadonlyMap<string, File>;
};

function makeVault(files: readonly File[]): AttachmentVault {
  const byPath = new Map(files.map((file) => [file.name, file]));
  return {
    id: "test-vault",
    kind: "readonly",
    name: "Test vault",
    entries: files.map((file) => ({
      path: file.name,
      kind: "asset" as const,
      modified: file.lastModified,
    })),
    files: byPath,
    async file(path: string): Promise<File | undefined> {
      return byPath.get(path);
    },
    async read(path: string) {
      const file = byPath.get(path);
      return { content: file ? await file.text() : "", fingerprint: "test" };
    },
    async asset(path: string): Promise<Blob | undefined> {
      return byPath.get(path);
    },
    async refresh(): Promise<void> {},
    close(): void {},
  };
}

function dialog(): HTMLDialogElement {
  const found = document.querySelector<HTMLDialogElement>("dialog");
  if (!found) throw new Error("attachment dialog was not opened");
  return found;
}

describe("attachment dialog", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event("close"));
      },
    });
    URL.createObjectURL = vi.fn(() => "blob:test-attachment");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    document.querySelector<HTMLDialogElement>("dialog")?.close();
    document.body.replaceChildren();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("opens immediately and renders a text preview as text with a download anchor", async () => {
    const file = new File(["<script>alert(1)</script>"], "notes/readme.html", {
      type: "text/html",
    });

    const pending = showAttachment(makeVault([file]), "notes/readme.html");
    expect(dialog().textContent).toContain("읽는 중");
    await pending;

    const root = dialog();
    const preview = root.querySelector("pre");
    expect(preview?.textContent).toBe("<script>alert(1)</script>");
    expect(root.querySelector("script")).toBeNull();
    expect(root.querySelector<HTMLAnchorElement>("a")?.download).toBe("readme.html");
    expect(root.textContent).toContain("notes/readme.html");
    expect(root.textContent).toContain("25 B");
  });

  it("uses a validated image blob for preview and revokes URLs only after close", async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "assets/icon.png", {
      type: "image/png",
    });
    const vault = makeVault([file]);

    await showAttachment(vault, "assets/icon.png");

    const image = dialog().querySelector<HTMLImageElement>("img");
    expect(image?.src).toBe("blob:test-attachment");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    dialog().close();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-attachment");
  });

  it("keeps a large image downloadable when preview validation rejects it", async () => {
    const file = new File([new Uint8Array(MAX_ASSET_BYTES + 1)], "assets/large.png", {
      type: "image/png",
    });
    const vault = makeVault([file]);
    vault.asset = async () => {
      throw new Error("asset exceeds limit");
    };

    await showAttachment(vault, "assets/large.png");

    const root = dialog();
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector<HTMLAnchorElement>("a")?.download).toBe("large.png");
    expect(root.textContent).toContain("내려받은 뒤 기기의 앱에서 열 수 있습니다.");
  });

  it("leaves arbitrary binary files as download-only", async () => {
    const file = new File([new Uint8Array([0, 255, 17])], "archive.zip", {
      type: "application/zip",
    });

    await showAttachment(makeVault([file]), "archive.zip");

    const root = dialog();
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector("pre")).toBeNull();
    expect(root.querySelector<HTMLAnchorElement>("a")?.download).toBe("archive.zip");
    expect(root.textContent).toContain("내려받은 뒤 기기의 앱에서 열 수 있습니다.");
  });

  it("caps readable previews at 200 KiB", async () => {
    const file = new File(["a".repeat(200 * 1024 + 12)], "logs/output.log", {
      type: "text/plain",
    });

    await showAttachment(makeVault([file]), "logs/output.log");

    const preview = dialog().querySelector("pre");
    expect(preview?.textContent?.startsWith("a".repeat(200 * 1024))).toBe(true);
    expect(preview?.textContent).toContain("200 KiB까지 표시합니다.");
  });

  it("does not let a stale read replace the current dialog", async () => {
    let resolveFirst: ((file: File) => void) | undefined;
    const first = new File(["first"], "first.txt", { type: "text/plain" });
    const second = new File(["second"], "second.txt", { type: "text/plain" });
    const vault = makeVault([first, second]);
    const file = vault.file;
    vault.file = (path: string) =>
      path === "first.txt"
        ? new Promise<File | undefined>((resolve) => {
            resolveFirst = (value) => resolve(value);
          })
        : file
          ? file(path)
          : Promise.resolve(undefined);

    const firstRead = showAttachment(vault, "first.txt");
    const secondRead = showAttachment(vault, "second.txt");
    await secondRead;
    expect(dialog().textContent).toContain("second");

    resolveFirst?.(first);
    await firstRead;
    expect(dialog().textContent).toContain("second");
    expect(dialog().textContent).not.toContain("first");
  });
});
