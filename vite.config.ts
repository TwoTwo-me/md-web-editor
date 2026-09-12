import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import { z } from "zod";

const { version } = z
  .object({ version: z.string() })
  .parse(JSON.parse(readFileSync("package.json", "utf8")));
let revision = "development";
try {
  revision = execFileSync("git", ["rev-parse", "--short=12", "HEAD"]).toString().trim();
} catch (error) {
  if (!(error instanceof Error)) throw error;
}

const base = process.env["PAGES_BASE_PATH"] || "/md-web-editor/";

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(version), __BUILD_SHA__: JSON.stringify(revision) },
  build: { target: "es2022" },
  plugins: [
    {
      name: "offline-shell",
      generateBundle(_options, bundle) {
        this.emitFile({
          type: "asset",
          fileName: "manifest.webmanifest",
          source: JSON.stringify({
            id: base,
            name: "md-web-editor",
            short_name: "md-web-editor",
            description: "로컬 폴더에서 쓰는 오프라인 Markdown 편집기",
            lang: "ko",
            start_url: "./",
            scope: "./",
            display: "standalone",
            background_color: "#202024",
            theme_color: "#202024",
            icons: [192, 512].map((size) => ({
              src: `data:image/png;base64,${readFileSync(`public/icons/app-${size}.png`).toString("base64")}`,
              sizes: `${size}x${size}`,
              type: "image/png",
              purpose: "any",
            })),
          }),
        });
        const publicFiles = readdirSync("public", { recursive: true, encoding: "utf8" }).filter(
          (file) => statSync(join("public", file)).isFile(),
        );
        const files = [
          ...new Set([".", "index.html", "manifest.webmanifest", ...publicFiles, ...Object.keys(bundle)]),
        ];
        const digest = createHash("sha256").update(JSON.stringify(files));
        for (const file of publicFiles) digest.update(readFileSync(join("public", file)));
        const key = `md-editor-${version}-${revision}-${digest.digest("hex").slice(0, 12)}`;
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: `
const CACHE=${JSON.stringify(key)};
const ASSETS=${JSON.stringify(files)}.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('message',event=>{if(event.data==='activate')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('md-editor-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const u=new URL(event.request.url);u.search='';u.hash='';if(!ASSETS.includes(u.href))return;event.respondWith(caches.open(CACHE).then(async c=>(await c.match(u.href))||fetch(event.request)));});
`,
        });
      },
    },
  ],
});
