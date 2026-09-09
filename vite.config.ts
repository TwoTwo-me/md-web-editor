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

export default defineConfig({
  base: process.env["PAGES_BASE_PATH"] || "/md-web-editor/",
  define: { __APP_VERSION__: JSON.stringify(version), __BUILD_SHA__: JSON.stringify(revision) },
  build: { target: "es2022" },
  plugins: [
    {
      name: "offline-shell",
      generateBundle(_options, bundle) {
        const publicFiles = readdirSync("public", { recursive: true, encoding: "utf8" }).filter(
          (file) => statSync(join("public", file)).isFile(),
        );
        const files = [...new Set([".", "index.html", ...publicFiles, ...Object.keys(bundle)])];
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
