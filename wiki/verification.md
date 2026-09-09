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
