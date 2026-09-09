# Product contract

md-web-editor is a static, local-first Markdown workspace served by GitHub Pages. There is no application server, account, sync service, analytics, or AI API.

## Requirements
1. tmux-like prefix → letter commands: Esc or Ctrl+Space, plus a click/touch command trigger; configurable enabled triggers, discoverable command palette, no disruption to IME.
2. Source, live-preview and reading modes using CodeMirror 6 and CommonMark parsing. GFM tables, strikethrough, task lists, fenced code and footnotes. Source text remains exact; HTML constructs are sanitized, never executed. Remote media stays blocked. Local images render from Blob URLs.
3. `[[wiki links]]`, aliases, headings, Markdown inline/reference links, relative folders, Unicode and URL-encoded targets. Resolve deterministically; ambiguous same-name links require choice. Both contribute edges; missing files appear as unresolved nodes and can be created explicitly. Code blocks do not contribute links.
4. Global/local force-directed graph: drag nodes, pan/zoom, click navigation, hover neighbors, search, tag/attachment/missing/orphan filters, local depth, groups/colors, arrows, labels, node/edge sizes, center/repel/link force/distance, pause/reset/fit and time-lapse. Accessible list alongside spatial interface.
5. Light/dark/system themes, safe JSON theme schema, local theme import/export, committed bundled themes. No arbitrary CSS or URLs in themes.
6. Directory picker reads local files with explicit permission. Folder mode changes original files with debounced auto-save. No hidden network note transfer. No personal content in app URL or logs. Refresh detects outside changes; saving detects conflict and preserves both versions.
7. Honest fallback: browsers without directory write APIs can inspect imported folders in readonly mode and use the demo. They must never claim a disk save. Chrome/Edge on Windows, macOS and Linux are the full-edit target.
8. New note/folder path, quick switch, full-text search, tabs, backlinks, outgoing links, outline, daily note, command palette, text formatting, and recovery/export complete the everyday editing flow.

## Save semantics
Typing → local recovery journal → debounce 500ms → serialized checked disk write → saved. Switching note/vault waits for pending writes. Failure remains unsaved with retry/export. Native beforeunload guards pending work; browser-process termination cannot guarantee a last keystroke, so local recovery is retained. Recovery is scoped by local vault identity, offered visibly rather than silently overwriting disk. No automatic destructive file operations.

## Privacy scope
The hosting provider sees requests for public app assets. It must never receive filenames, note content, search queries or rendered resources. Browser extensions, malicious browser/OS and deliberate user-authorized external-link navigation are outside the app's control. UI explains an external destination before navigation and omits referrer data. Updates are app assets only, never notes.
