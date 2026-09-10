# Verification matrix

Results are pending until observed. Use a generated synthetic vault outside tracked sources for browser folder tests.

- Markdown: CommonMark constructs, GFM tables/task/strike, reference and wiki links, Unicode paths, ambiguous basename, missing targets, anchors, nested lists, code false positives, HTML safety, local images.
- Storage: open nested folder; empty folder; .md/.markdown case variants; rapid edits; tab switch; refresh; disk write; external conflict; permission failure; interrupted save/recovery; two tabs; readonly fallback. Compare actual disk content.
- Commands: Esc and Ctrl+Space; timeout; prefix cancellation; normal typing; Korean IME; physical key code; modal focus restoration; every suffix maps to its named action.
- Graph: both link kinds, drag/pan/zoom, node navigation, local depth, all settings, groups, reset, pause/time-lapse, accessible note list, empty graph.
- Themes: light/dark/system, token JSON import/export and malformed/injecting files rejected; custom theme reload; no URL/CSS execution.
- Privacy: collect requests after app load while opening/editing/searching/graphing malicious fixture; expect zero note-derived requests. No personal names/content/paths in source/build/logs. Block external resources, script/events/forms/SVG, including same-origin beacon paths.
- UI: 375px, 768px, 1440px; long CJK paths; empty states; overflow; keyboard-only; reduced motion; theme contrast; focus and native modal.
- Deployment: base path `/md-web-editor/`; immutable build SHA visible; refresh; offline app shell; service worker update; source and deployment version match.

Run typecheck, Biome, Vitest, production build before source feature pushes. Record real browser observations after local milestone and after each major Pages deployment. No claimed cross-OS physical testing when only macOS was exercised.

## Local checkpoint 2026-09-10 (pre-release)
- Initial integrated build: TypeScript and Vite production build pass; initial Vitest baseline 20/20 across 7 files.
- Computer Use Chrome: welcome screen, example opening, 9-note tree, note text, 3 outgoing links, 1 backlink and outline observed.
- Primitive showcase: dark dialog focus and Escape close observed; light controls and CJK text rendered.
- Audit found incomplete live block rendering and save-drain/control synchronization edges; these are being fixed before the first deployment. This checkpoint is not final acceptance.

## Native filesystem checkpoint
Computer Use on the production preview opened only the generated test folder through Chrome's native directory picker, granted that folder edit permission, entered a synthetic marker without clicking Save, and confirmed the marker in the original disk file. An external append followed by editor typing produced the conflict dialog; disk retained the external text and did not receive the conflicting buffer. Choosing disk restored that version in the editor. Esc → P opened the command palette. Ctrl+Space was intercepted by CodeMirror completion during the first pass; the prefix now takes capture-phase precedence (new regression test). First 375px layout failure was fixed by explicit grid tracks; measured main width changed from 0 to 331px.

## Public deployment privacy checkpoint
Aside browser rendered the synthetic adversarial note on the public `d1ebfb88799d` deployment. Resource Timing contained only the two initial hashed application JS/CSS resources after editing and switching to reading mode. Script, iframe, form, SVG and event-handler DOM count was zero; a same-origin image retained no `src`. No synthetic note sentinel appeared in a resource URL. This verifies the application's own resource barrier for the fixture; it does not resolve the shared-origin storage boundary identified by security review.

The public native-folder graph also exercised the modification timeline: first position left only four undated unresolved/tag nodes, and End restored all eight nodes (three real notes, one attachment, two tags and two unresolved links). The timeline therefore responds to real file timestamps; it represents modification order, not creation history.

## Latest candidate acceptance (2026-09-10)

`8b8bfae46f858c2315e66f6093662747071bb7b5` passes 66 tests in 13 files, TypeScript/Biome and production build. [Pages run 34419057017](https://github.com/TwoTwo-me/md-web-editor/actions/runs/34419057017) successfully published that exact source. Computer Use activated the update, checked the build marker and hashed script, opened the generated local folder through Chrome's native picker and toggled a live task checkbox. The original disk file changed without Save. Ctrl+Space → P opened the command palette; public graph zoom, Fit and the full nine-node list worked, with no console warnings or errors.

Local browser measurements found no intersections among visible graph labels; hovering a suppressed label revealed it. A fresh 27-frame set covers light/dark/Quiet Violet, editor modes, graph controls/settings/list, dialogs and 375–1440px layouts. Independent visual results are recorded in the candidate release entry after review. Native testing used macOS Chrome; physical Windows/Linux and Firefox/Safari execution has not been claimed. Other browsers have a read-only folder fallback.
