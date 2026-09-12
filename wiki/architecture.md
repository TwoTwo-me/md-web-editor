# Architecture

## Decisions
Vite + strict TypeScript + vanilla DOM shell minimizes framework/runtime surface. CodeMirror 6 owns editor state, Markdown-it owns standards parsing, DOMPurify filters passive HTML, d3-force owns graph layout. pnpm lockfile pins dependencies. No runtime CDN or external font. Vitest protects behavioral boundaries; browser QA drives actual disk writes and production deployment.

## Modules
- `src/core/types.ts`: shared immutable boundary contracts.
- `src/core/pane-layout*.ts` and `workspace-panes.ts`: bounded recursive tab groups, focused navigation and vault-scoped local layout metadata; UI surface reconciles stable editor/graph hosts across moves.
- `src/core/sessions.ts` and `session-*.ts`: one canonical document and autosave writer per path, with independently identified editor views and minimal mirrored content changes.
- `src/storage/`: local directory adapter, read-only import, demo adapter, SHA-256 fingerprint, serialized checked writes, local recovery journal and autosave controller. Files are never fetched via HTTP.
- `src/editor/`: Markdown parsing/index/link resolution, sanitized rendering, CodeMirror live/source/reading modes. Renderer only returns safe local markup; asset loader receives vault-relative paths and produces allowed raster blobs. Graph and backlinks use the same parser/resolver.
- `src/graph/`: graph data filters, settings schema, layout and pointer/keyboard interaction. Data IDs stay in memory only. Main application passes current graph and selected path.
- `src/ui/`: DOM primitives, shell/explorer/inspector, commands/prefix, dialogs and settings.
- `src/styles/`: theme token definitions, shell, document and graph styles.
- `src/main.ts`: composition and workspace lifecycle only; split controllers keep modules below 250 substantive lines.

## Ownership and concurrency
A per-origin Web Lock serializes writes across app tabs, fingerprint checks compare current disk bytes to the opened snapshot. Cross-origin/native writers cannot share the lock, so read-before-write is best effort; never promise atomic compare-and-swap against an external editor. Browser stream commit ensures complete-file replacement, failures retain the local buffer. Async responses are tied to vault/file identity; late reads cannot overwrite a newer tab. File switches flush the current draft. Unsaved UI never clears from an older save revision. File rename/deletion is not automatic.

Multiple panels displaying the same note share that writer. Closing one view leaves the document alive; closing its final view drains saving before removal. Pending opens are scoped to each tab group and workspace generation. Split ratios and tree references are validated before restoring metadata. See [ADR 004](decisions/004-split-panels.md).

## Path/link rules
Normalize separators, decode URL paths safely, collapse `.`/`..` while refusing vault escape. Markdown relative links resolve from source directory; wiki paths first resolve exact vault path, then sibling and unique basename. Extension `.md` or `.markdown` recognized without case sensitivity. Fragments stay separate and scroll headings/block IDs. Explicit external protocols are intercepted; script/data/file/protocol-relative paths blocked. Reference links are parsed through Markdown tokens; code/raw HTML cannot introduce graph edges. Missing link creation refuses traversal, collisions and invalid OS names.

## Network barrier
Build CSP meta occurs before scripts: default-src none; scripts self; inline styles allowed for CodeMirror and graph transforms; connect none; images blob/data only; fonts self; objects/frames/media/forms/base none. Markdown sanitizer also strips all resource-loading HTML attributes, style, SVG, forms, ping and targets. App assets are eagerly bundled; no note-sensitive dynamic URL loading. Service worker caches an explicit app-asset manifest only and never dynamically caches arbitrary requests. No runtime remote calls. Themes are read as local JSON and parse through a fixed schema.

## Source references
- [File System Access](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
- [Permission model](https://wicg.github.io/file-system-access/)
- [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
- [CodeMirror decorations](https://codemirror.net/examples/decoration/)
- [Obsidian graph capabilities](https://obsidian.md/help/plugins/graph)

Consulted 2026-09-10. Implementation tests, not assumptions about browser brands, determine supported paths.

## Pre-implementation gap review decisions
A read-only Metis audit identified 10 gaps, resolved here before module work:
- Vault is a discriminated readonly/writable union. Readonly exposes no write/create methods.
- Storage throws typed `VaultError` with code (`conflict`, `permission`, `readonly`, `invalid-path`, `exists`, `missing`, `io`) and optional current snapshot. Autosave owns revision counters and explicit status; an older completion cannot mark newer edits saved.
- Refresh updates entries; controller rereads all index notes and the active clean buffer. Dirty buffers are flushed first; a conflict cancels refresh and offers disk/local copies. Async work is guarded by workspace generation.
- Recovery ID is a random ID stored with a directory handle in IndexedDB and matched through isSameEntry. Key is vault ID + normalized path. Journal has content/base fingerprint/revision/time. Reopening offers recovery; normal successful matching-revision save removes it; explicit discard clears it. Quota failure is shown and pending state retained. Demo gets a separate browser-local ID.
- Markdown-it CommonMark-compatible token stream plus table/strike/task/footnote and wiki extensions is canonical for index/render. CodeMirror syntax only changes visual decorations, never graph semantics. Heading slugs use normalized lowercase Unicode text, spaces→hyphens, unique suffixes; fixtures verify duplicate IDs and fragments.
- External links allow only https/http/mailto without embedded credentials. A native dialog displays exact destination; navigation follows explicit action via noopener,noreferrer and page referrer policy. Malformed, protocol-relative, script/data/file links are blocked.
- Local assets: only PNG/JPEG/GIF/WebP/AVIF with matching signature and MIME, max 20 MiB; SVG/HTML rejected. Decode failure leaves alt text. Object URLs revoked when editor document/vault is replaced or widget destroyed.
- Escape priority: composition first, native modal, CodeMirror completion/search transient handling, active prefix cancellation, then prefix activation. Main prefix listener runs in bubble phase; editor handled/defaultPrevented Escape is respected.
- Graph time-lapse reveals nodes in ascending file lastModified order (explicitly labeled modification history, not creation dates). Node modified=0 for missing/tag. Settings schema bounds/defaults and reset live in src/graph/settings.ts; local depth 1–5; use deterministic graph fixture to verify all controls. View state is local preferences, no filenames in URLs.
- Pages source uses Actions, Vite base /md-web-editor/, build SHA+version compile-time constants, explicit static-asset cache list; waiting worker activates on next session without forced takeover. Cache names include version+SHA; no document content ever reaches cache requests. Workflow dispatch/tag follows verified commit and source push.
