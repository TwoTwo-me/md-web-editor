import type { Vault } from "../core/types";
import { MAX_ASSET_BYTES } from "../storage/fingerprint";
import { isImagePath } from "../storage/paths";
import { openDialog } from "./dialog";
import { element } from "./dom";

const MAX_PREVIEW_BYTES = 200 * 1024;
const textExtensions = new Set([
  "c",
  "cc",
  "conf",
  "cpp",
  "css",
  "csv",
  "h",
  "hpp",
  "html",
  "ini",
  "java",
  "js",
  "json",
  "jsx",
  "log",
  "markdown",
  "md",
  "mjs",
  "mts",
  "py",
  "rs",
  "scss",
  "sh",
  "sql",
  "svg",
  "tex",
  "ts",
  "tsx",
  "txt",
  "toml",
  "vue",
  "xml",
  "yaml",
  "yml",
]);
const textMimeTypes = new Set([
  "application/ecmascript",
  "application/javascript",
  "application/json",
  "application/ld+json",
  "application/xml",
  "image/svg+xml",
]);

let latestRequest: symbol | undefined;

export async function showAttachment(vault: Vault, path: string): Promise<void> {
  const { dialog, body } = openDialog("첨부 파일");
  const request = Symbol("attachment-request");
  latestRequest = request;
  let closed = false;
  const objectUrls: string[] = [];

  const releaseUrls = (): void => {
    for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl);
    objectUrls.length = 0;
  };
  dialog.addEventListener(
    "close",
    () => {
      closed = true;
      releaseUrls();
    },
    { once: true },
  );

  const filename = fileName(path);
  renderLoading(body, path, filename);
  const isCurrent = (): boolean =>
    !closed && latestRequest === request && dialog.isConnected && dialog.open;

  try {
    const loaded = await loadFile(vault, path, filename);
    if (!isCurrent()) return;
    await renderLoaded(body, path, filename, loaded, objectUrls, isCurrent);
  } catch (cause: unknown) {
    if (!isCurrent()) return;
    renderError(body, path, filename, cause);
  }
}

type LoadedFile = {
  readonly file: File;
  readonly image?: Blob;
};

async function loadFile(vault: Vault, path: string, filename: string): Promise<LoadedFile> {
  const file = await vault.file?.(path);
  let image: Blob | undefined;
  if (isImagePath(path) && (file === undefined || file.size <= MAX_ASSET_BYTES)) {
    try {
      image = await vault.asset(path);
    } catch (cause: unknown) {
      if (!file) {
        throw cause instanceof Error ? cause : new Error("이미지를 읽지 못했습니다.");
      }
    }
  }
  if (file) return image ? { file, image } : { file };
  if (image) {
    return {
      file: new File([image], filename, { type: image.type }),
      image,
    };
  }
  if (vault.entries.find((entry) => entry.path === path)?.kind !== "note") {
    throw new Error("이 파일을 읽을 수 없습니다.");
  }
  const snapshot = await vault.read(path);
  return {
    file: new File([snapshot.content], filename, { type: "text/plain" }),
  };
}

function renderLoading(body: HTMLElement, path: string, filename: string): void {
  const content = metadata(path, filename);
  content.append(element("p", "attachment-state muted", "읽는 중…"));
  body.replaceChildren(content);
}

async function renderLoaded(
  body: HTMLElement,
  path: string,
  filename: string,
  loaded: LoadedFile,
  objectUrls: string[],
  isCurrent: () => boolean,
): Promise<void> {
  const { file } = loaded;
  const content = metadata(path, filename, file.size);
  const isImage = loaded.image !== undefined;
  const text = isTextPath(path, file.type);
  if (isImage) {
    const imageUrl = objectUrl(loaded.image, objectUrls);
    const image = element("img", "attachment-image");
    image.src = imageUrl;
    image.alt = filename;
    const preview = element("div", "attachment-preview");
    preview.append(image);
    content.append(preview);
  } else if (text) {
    const preview = element("pre", "attachment-text");
    preview.textContent = await readExcerpt(file);
    if (!isCurrent()) return;
    content.append(preview);
  } else {
    content.append(
      element(
        "p",
        "attachment-unsupported muted",
        "이 형식은 내려받은 뒤 기기의 앱에서 열 수 있습니다.",
      ),
    );
  }
  if (!isCurrent()) return;
  const downloadBlob = file.slice(0, file.size, "application/octet-stream");
  const downloadUrl = objectUrl(downloadBlob, objectUrls);
  const download = element("a", "button primary", "내려받기");
  download.href = downloadUrl;
  download.download = filename;
  const actions = element("div", "dialog-actions");
  actions.append(download);
  content.append(actions);
  body.replaceChildren(content);
}

function renderError(body: HTMLElement, path: string, filename: string, cause: unknown): void {
  const content = metadata(path, filename);
  content.append(
    element("p", "error-text", cause instanceof Error ? cause.message : "파일을 읽지 못했습니다."),
  );
  body.replaceChildren(content);
}

function metadata(path: string, filename: string, size?: number): HTMLElement {
  const content = element("div", "attachment-content");
  content.append(element("p", "attachment-path", path), element("p", "attachment-name", filename));
  if (size !== undefined) content.append(element("p", "attachment-size muted", formatBytes(size)));
  return content;
}

function objectUrl(blob: Blob, objectUrls: string[]): string {
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  return url;
}

async function readExcerpt(file: File): Promise<string> {
  const excerpt = await file.slice(0, MAX_PREVIEW_BYTES).text();
  return file.size > MAX_PREVIEW_BYTES
    ? `${excerpt}\n\n… 미리보기는 200 KiB까지 표시합니다.`
    : excerpt;
}

function fileName(path: string): string {
  return path.replaceAll("\\", "/").split("/").at(-1) ?? path;
}

function extension(path: string): string | undefined {
  const name = fileName(path);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : undefined;
}

function isTextPath(path: string, mime: string | undefined): boolean {
  return (
    Boolean(mime && (mime.startsWith("text/") || textMimeTypes.has(mime))) ||
    textExtensions.has(extension(path) ?? "")
  );
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}
