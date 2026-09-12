# md-web-editor

A private, local-folder Markdown workspace for GitHub Pages. Write in live preview, follow wiki and Markdown links, and explore an interactive graph. Notes stay on your device.

**Full folder editing:** current Chrome or Edge on Windows, macOS, Linux. Other browsers can open a folder read-only. No account, server, telemetry or note upload. Autosave modifies the folder you explicitly select; save failures and conflicts stay visible.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm check
pnpm build
```

Use **Open folder** to select local notes or **Explore example** for a synthetic workspace. Press **Esc**, then **P** for commands. Alternative prefix: **Ctrl+Space**. No note data is placed in the URL.

Remote images, active HTML and network resources embedded in notes are blocked. Standard Markdown source remains editable. Approved local raster images render from memory. External links show their destination before opening.

See the [project wiki](wiki/README.md), [product contract](wiki/product.md), [privacy decision](wiki/decisions/001-local-data.md) and [design system](DESIGN.md). Deployment and verification results are recorded in the wiki as they are observed.

The editor uses the existing GitHub.io address. Other Pages projects under the same account share its browser-storage origin. A dedicated hostname is an optional extra isolation boundary; it is not required for local editing or no-upload operation. See [origin isolation](wiki/decisions/003-origin-isolation.md).

To bundle a theme, add a schema-compatible JSON file to `public/themes/` and rebuild. Each file appears in Settings without a runtime request; `builtin` and `custom` are reserved names. Use the provided Quiet Violet file as a template.

**All-file links:** enable “모든 파일을 링크 대상으로 표시” in Settings to include PDF, text, office, archive and other file types in discovery and wiki completion. New wiki links save as `[[/folder/file.ext|label]]`, rooted at your selected folder. File links open a safe local preview or offer a download; HTML/SVG are shown as text, and operating-system apps are not launched by the website. Existing notes are not rewritten just by opening them.

**Split panels:** press **Esc → R** to open a graph on the right, or right-click an existing graph tab and choose “오른쪽으로 이동”. Drag tabs between groups or onto a panel edge to split. The group menu also offers duplicate right/down, move, close and merge actions. Drag a divider or use its arrow keys to resize. **Esc → V/J** duplicates the active tab right/down; **Esc → 3** focuses the next group. Duplicate note views share one autosave queue while their modes and cursors stay independent. Reopening the same folder restores its local panel layout. Small workspaces use a group selector.

**Install and use offline:** open the site online once and wait for “오프라인 사용 준비 완료”. Use Chrome's address-bar install icon or its app-install menu. The installed `md-web-editor` opens in a separate window. After the application is cached, you can launch it, open a local folder, edit, follow links, use the graph and autosave without internet. Initial download and application updates require a connection. Folder access still requires your selection/permission. Clearing browser app data removes the cached application and browser-only drafts/settings; original files in your folder remain. Read-only imports must be selected again after restart. See [installation and offline behavior](wiki/decisions/005-install-offline.md).
