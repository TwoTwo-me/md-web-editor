# ADR 001: Local data never enters network requests
Status: accepted. Context: the static site must edit private Markdown without uploading it.

Use direct directory handles; read-only file input fallback; no backend. In-memory index and local recovery journal only. Store browser preferences locally. Block network resources in notes at parser, renderer and CSP layers, including same-origin relative URLs. Render only approved local raster image blobs. External links require an explicit destination dialog and never navigate automatically. App URL contains no note path/hash, and document title stays application-only. Do not log filenames/content.

Prevent silent data loss with conflict fingerprints, per-origin Web Locks, revision-aware save queue, recovery and explicit overwrite/reload/export choices. Readonly imports cannot create or edit files. The test suite uses synthetic notes and malicious-resource fixtures. App build artifacts contain no vault fixtures loaded from the user's filesystem.

Consequences: remote images/iframes/scripts and arbitrary CSS themes are intentionally inactive; source is preserved. Native disk overwrite requires supported browser API. Browser termination has an unavoidable journal window and is not described as fully crash-proof.
