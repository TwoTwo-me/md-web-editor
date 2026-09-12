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
