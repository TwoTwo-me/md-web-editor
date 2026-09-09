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

The current project-path deployment is a test candidate. GitHub Pages projects under one account share browser storage and permissions; private vault use needs a hostname dedicated to this editor. See [origin isolation](wiki/decisions/003-origin-isolation.md) for the pending deployment decision.

To bundle a theme, add a schema-compatible JSON file to `public/themes/` and rebuild. Each file appears in Settings without a runtime request; `builtin` and `custom` are reserved names. Use the provided Quiet Violet file as a template.
