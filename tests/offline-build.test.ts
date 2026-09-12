import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { Script } from "node:vm";
import { build } from "vite";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const basePath = process.env["PAGES_BASE_PATH"] || "/md-web-editor/";
const applicationScope = `https://editor.test${basePath}`;
const manifestSchema = z.object({
  id: z.string().min(1),
  start_url: z.string().min(1),
  scope: z.string().min(1),
  name: z.literal("md-web-editor"),
  short_name: z.literal("md-web-editor"),
  display: z.literal("standalone"),
  icons: z.array(
    z.object({
      src: z.string().min(1),
      sizes: z.string(),
      type: z.literal("image/png"),
    }),
  ),
});

async function buildProductionBundle(): Promise<string> {
  const output = await mkdtemp(join(tmpdir(), "md-web-editor-pwa-"));
  await build({
    configFile: join(process.cwd(), "vite.config.ts"),
    logLevel: "silent",
    build: { emptyOutDir: true, outDir: output },
  });
  return output;
}

async function allOutputFiles(output: string): Promise<readonly string[]> {
  const entries = await readdir(output, { recursive: true });
  const files = await Promise.all(
    entries.map(async (entry) => ({ entry, details: await stat(join(output, entry)) })),
  );
  return files
    .filter(({ entry, details }) => details.isFile() && entry !== "sw.js")
    .map(({ entry }) => entry);
}

function pngDimensions(contents: Uint8Array): readonly [number, number] {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  expect([...contents.subarray(0, signature.length)]).toEqual(signature);
  const view = new DataView(contents.buffer, contents.byteOffset, contents.byteLength);
  return [view.getUint32(16), view.getUint32(20)];
}

async function manifestIconBytes(
  source: string,
  manifestUrl: URL,
  output: string,
): Promise<Uint8Array> {
  const dataPrefix = "data:image/png;base64,";
  if (source.startsWith(dataPrefix)) return Buffer.from(source.slice(dataPrefix.length), "base64");
  const iconUrl = new URL(source, manifestUrl);
  expect(iconUrl.href.startsWith(applicationScope)).toBe(true);
  const iconPath = relative(new URL(applicationScope).pathname, iconUrl.pathname);
  return readFile(join(output, iconPath));
}

function manifestHref(markup: string): string | undefined {
  for (const tag of markup.matchAll(/<link\b[^>]*>/giu)) {
    const relation = /\brel\s*=\s*(["'])(?<value>[^"']*)\1/iu.exec(tag[0])?.groups?.["value"];
    if (!relation?.split(/\s+/u).includes("manifest")) continue;
    return /\bhref\s*=\s*(["'])(?<value>[^"']*)\1/iu.exec(tag[0])?.groups?.["value"];
  }
  return undefined;
}

function runServiceWorker(source: string, installFails = false) {
  const listeners = new Map<string, (event: unknown) => void>();
  const cachedUrls = new Set<string>();
  const cacheNames = ["md-editor-previous", "unrelated-cache"];
  const deletedNames: string[] = [],
    fetchCalls: string[] = [];
  let skipWaitingCalls = 0;
  const cache = {
    async addAll(urls: readonly string[]): Promise<void> {
      if (installFails) throw new Error("Cache storage is unavailable.");
      urls.forEach((url) => {
        cachedUrls.add(url);
      });
    },
    async match(url: string): Promise<Response | undefined> {
      return cachedUrls.has(url) ? new Response("cached") : undefined;
    },
  };
  const context = {
    URL,
    caches: {
      async open(name: string): Promise<typeof cache> {
        if (!cacheNames.includes(name)) cacheNames.push(name);
        return cache;
      },
      async keys(): Promise<readonly string[]> {
        return cacheNames;
      },
      async delete(name: string): Promise<boolean> {
        deletedNames.push(name);
        const index = cacheNames.indexOf(name);
        if (index < 0) return false;
        cacheNames.splice(index, 1);
        return true;
      },
    },
    fetch: async (request: string): Promise<Response> => {
      fetchCalls.push(request);
      return new Response("network");
    },
    self: {
      registration: { scope: applicationScope },
      addEventListener(type: string, listener: (event: unknown) => void): void {
        listeners.set(type, listener);
      },
      skipWaiting(): void {
        skipWaitingCalls += 1;
      },
    },
  };
  new Script(source).runInNewContext(context);
  const dispatch = (type: string, event: unknown): void => {
    const listener = listeners.get(type);
    if (!listener) throw new Error(`Missing ${type} listener.`);
    listener(event);
  };
  return {
    names: cacheNames,
    cachedUrls,
    deletedNames,
    fetchCalls,
    skipWaitingCalls: () => skipWaitingCalls,
    dispatch,
  };
}

function eventWithCompletion(): {
  readonly event: { readonly waitUntil: (work: Promise<unknown>) => void };
  readonly completed: () => Promise<unknown>;
} {
  let work: Promise<unknown> | undefined;
  return {
    event: {
      waitUntil: (nextWork) => {
        work = nextWork;
      },
    },
    completed: async () => {
      if (!work) throw new Error("Service worker did not wait for its asynchronous work.");
      return work;
    },
  };
}

function fetchEvent(url: string): {
  readonly event: {
    readonly request: Request;
    readonly respondWith: (work: Promise<Response>) => void;
  };
  readonly response: () => Promise<Response> | undefined;
} {
  let work: Promise<Response> | undefined;
  return {
    event: {
      request: new Request(url),
      respondWith: (nextWork) => {
        work = nextWork;
      },
    },
    response: () => work,
  };
}

describe("production offline bundle", () => {
  it("ships an installable manifest with correctly sized PNG icons", async () => {
    const output = await buildProductionBundle();
    try {
      const href = manifestHref(await readFile(join(output, "index.html"), "utf8"));
      if (!href) throw new Error("Production page has no manifest link.");
      const manifestUrl = new URL(href, applicationScope);
      expect(manifestUrl.href).toBe(new URL("manifest.webmanifest", applicationScope).href);
      const manifest = manifestSchema.parse(
        JSON.parse(await readFile(join(output, "manifest.webmanifest"), "utf8")),
      );
      const startUrl = new URL(manifest.start_url, manifestUrl);
      expect(new URL(manifest.id, startUrl.origin).href).toBe(applicationScope);
      expect(startUrl.href).toBe(applicationScope);
      expect(new URL(manifest.scope, manifestUrl).href).toBe(applicationScope);

      for (const size of [192, 512] as const) {
        const icon = manifest.icons.find((candidate) => candidate.sizes === `${size}x${size}`);
        if (!icon) throw new Error(`Manifest has no ${size}px icon.`);
        expect(await pngDimensions(await manifestIconBytes(icon.src, manifestUrl, output))).toEqual(
          [size, size],
        );
      }
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });

  it("preloads every emitted startup file and serves app navigation while offline", async () => {
    const output = await buildProductionBundle();
    try {
      const source = await readFile(join(output, "sw.js"), "utf8");
      const worker = runServiceWorker(source);
      const install = eventWithCompletion();

      worker.dispatch("install", install.event);
      await install.completed();
      const expectedUrls = (await allOutputFiles(output)).map(
        (file) => new URL(file, applicationScope).href,
      );
      expect(worker.cachedUrls).toEqual(new Set([applicationScope, ...expectedUrls]));

      const rootNavigation = fetchEvent(applicationScope);
      worker.dispatch("fetch", rootNavigation.event);
      await expect(rootNavigation.response()).resolves.toBeInstanceOf(Response);
      const indexedNavigation = fetchEvent(`${applicationScope}index.html?restore=draft`);
      worker.dispatch("fetch", indexedNavigation.event);
      await expect(indexedNavigation.response()).resolves.toBeInstanceOf(Response);
      expect(worker.fetchCalls).toEqual([]);

      const failedWorker = runServiceWorker(source, true);
      const failedInstall = eventWithCompletion();
      failedWorker.dispatch("install", failedInstall.event);
      await expect(failedInstall.completed()).rejects.toThrow("Cache storage is unavailable.");
      expect([failedWorker.skipWaitingCalls(), failedWorker.deletedNames]).toEqual([0, []]);
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });

  it("limits interception to precached app assets and activates only on an explicit request", async () => {
    const output = await buildProductionBundle();
    try {
      const worker = runServiceWorker(await readFile(join(output, "sw.js"), "utf8"));
      const install = eventWithCompletion();
      worker.dispatch("install", install.event);
      await install.completed();

      for (const url of [
        `${applicationScope}vault/private.md`,
        "https://example.test/telemetry.gif",
      ]) {
        const request = fetchEvent(url);
        worker.dispatch("fetch", request.event);
        expect(request.response()).toBeUndefined();
      }
      worker.dispatch("message", { data: "ignore" });
      expect(worker.skipWaitingCalls()).toBe(0);
      worker.dispatch("message", { data: "activate" });
      expect(worker.skipWaitingCalls()).toBe(1);

      const activation = eventWithCompletion();
      worker.dispatch("activate", activation.event);
      await activation.completed();
      expect(worker.names).toContain("unrelated-cache");
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });
});
