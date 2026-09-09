# md-web-editor design system

## 0. Research Log
- Concrete reference: Obsidian 1.12.7 inspected through Computer Use, including ribbon, explorer, tabs, outline, graph filters. Personal titles/content and screenshots are excluded from the repository.
- Embedded guidance: frontend minimalist, layout, design-system-architecture and designpowers lane C. Reference is Obsidian's workspace grammar; this is an original implementation and replaceable `.md` mark.
- Interaction reference: beui.dev command-palette source, consulted 2026-09-10. Adopt immediate focus, keyboard row navigation, filtered commands, focus restoration. Adapt entrance to 140ms opacity/translate; avoid springs on editor text.
- Image concept / marketing-screen lanes are inapplicable: this is a native-app-reference writing workspace, no raster artwork or marketing page.

## 1. Atmosphere & Identity
A quiet, precise writing room. Narrow tools frame a spacious document; links and the graph are the one violet thread through the workspace. Graph nodes are actual notes, never ornamental dots. Default dark resembles graphite paper; light is warm white. Mark: `.md` inside a 28px square, also supplied as replaceable SVG favicon.

## 2. Color
All component colors use CSS variables; JSON theme colors accept hex only.
| Token | Dark | Light | Purpose |
|---|---|---|---|
| --bg | #19191c | #ffffff | document canvas |
| --panel | #202024 | #f5f5f7 | explorer and inspector |
| --rail | #17171a | #ededf0 | narrow tool rail |
| --elevated | #29292f | #ffffff | dialog surface |
| --hover | #2e2e35 | #e8e8ed | hover feedback |
| --border | #35353e | #dcdce3 | separators |
| --text | #e4e4eb | #292930 | primary text |
| --muted | #a1a1b0 | #656574 | secondary text |
| --accent | #b5a0ff | #7151c7 | links, focus, active |
| --accent-soft | #322a48 | #eee8fb | active backgrounds |
| --success | #98ceae | #36734d | saved local status |
| --warning | #e8bc78 | #855500 | unsaved/conflict |
| --danger | #f39a9a | #ad3030 | failures |
| --graph-edge | #555363 | #bab6c8 | edges |
Groups: violet accent, muted green success, amber warning, rose danger. Background stays neutral.

## 3. Typography
System fonts only (no network font requests): UI `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`; code `ui-monospace, SFMono-Regular, Consolas, monospace`.
--font-xs 11px status; --font-sm 12px labels; --font-ui 14px controls; --font-body 16px prose. Document h1 30px/1.3, h2 24px/1.4, h3 20px/1.4; prose line-height 1.8. Editor width 740px, configurable 520–1100; font size configurable 14–24. CJK wraps naturally; metadata never forces the editor narrow.

## 4. Spacing & Layout
4px base: --s1 4px, --s2 8px, --s3 12px, --s4 16px, --s5 20px, --s6 24px, --s8 32px, --s12 48px. Radius 4px controls, 8px cards, 12px dialogs. Icon buttons 32px desktop, at least 40px touch.
100dvh shell: 48px rail, 244px explorer, flexible editor minmax(0,1fr), 264px inspector. Top tabs 42px, toolbar 44px, status 26px. Explorer list, editor and inspector each own their vertical scroll. Every shrinkable panel uses min-width/min-height:0. Header/status stay fixed. Resizable explorer/inspector via pointer and keyboard separators.
Below 1100px inspector becomes opt-in; below 760px explorer becomes dismissible overlay; below 480px toolbar wraps, source actions use labeled menu. Editor document insets clamp(20px,5vw,64px). Long labels ellipsize with title; document URLs wrap; code/tables may scroll within their blocks.

## 5. Primitives & States
- IconButton: real button, title+aria-label, hover/focus/pressed/disabled; current via aria-pressed.
- TextButton: neutral or accent, focus ring, pending disabled during picker/save action.
- NavRow: file/folder with nesting, active accent background, keyboard reachable, ellipsis.
- Tabs: active top line, visible close button, preserved editor session/undo per open note where available.
- Field/Toggle/Range: persistent label, error text, keyboard operable, native semantics.
- Dialog: native modal, label, Escape close, initial focus, trap, restore opener. Command rows show prefix suffix keys.
- Status: saved, saving, unsaved, conflict, readonly, recovery; words plus icon/color; aria-live polite.
- EmptyState: intentional icon, heading, one concrete primary action, concise help.
- Graph: SVG/canvas real nodes, pointer drag/pan/zoom, linked accessible note list alternative, selection affordance and settings panel.
The initial component showcase route is `?showcase`; verify primitive states before final screen QA.

## 6. Motion & Interaction
--motion-fast 140ms, --motion-normal 200ms, ease cubic-bezier(.2,.8,.2,1). Hover color transitions; dialog 6px translate+opacity, no document layout animation. Reduced motion removes transition and pauses graph simulation by default. Graph play/pause and reset always accessible. Prefix HUD appears immediately with available actions, expires at 2 seconds; composing input is never consumed. Esc cancels existing modal/prefix first; otherwise starts prefix. Ctrl+Space is optional alternate; buttons cover OS-intercepted keys.

## 7. Depth
Adjacent tonal surfaces plus 1px separators. No gradients, marketing cards or fake OS controls. Dialog only: 0 16px 60px rgb(0 0 0 / .24) over dim backdrop. Selected file uses flat accent tint; focus uses solid 2px outline.

## 8. Accessibility, Personas & Debt
Writer: keyboard entry, quick switch, IME safe. Explorer: graph dragging and readable settings. Privacy-conscious user: local-only labeling and clear save/conflict state. Keyboard-only: all commands, dialogs, sidebar, graph note list and zoom controls. Low vision: AA contrast, 200% zoom, no color-only statuses. CJK: labels wrap or ellipsize without clipped glyphs. Reduced motion honored. No accepted critical usability debt. Cross-browser disk-write limitation is explicitly labeled capability, not an apparent successful save. Raw active HTML/remote resources remain source-visible but are deliberately not executed.
