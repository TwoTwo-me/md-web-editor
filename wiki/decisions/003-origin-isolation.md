# ADR 003: Browser-origin isolation

Status: release decision pending.

GitHub Pages project paths under one account share a browser origin. IndexedDB and directory permissions are scoped to that origin, not to `/md-web-editor/`. The application's CSP blocks its own outbound resource requests, but cannot restrict a different page on the same origin. A compromised sibling site could read origin storage, including recovery drafts and persisted directory handles.

A dedicated hostname used only for this editor is the preferred boundary for private vault use. It can still be hosted by GitHub Pages. The owner must choose the hostname and configure its DNS. The default project URL has passed synthetic functional tests; that result is not evidence of isolation from sibling applications.

Removing persistent handles and plaintext drafts would reduce dormant exposure, but would not isolate a live editor window from same-origin scripts. It would also change the documented crash-recovery behavior. Such a change requires an explicit storage design and regression verification, not just a warning or a renamed database.

Until the deployment boundary is settled, release evidence must identify this limitation and must not claim absolute confidentiality against other same-origin applications. All development and browser acceptance tests use synthetic notes only.
