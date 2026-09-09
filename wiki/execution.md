# Execution ledger

| Step | Status | Evidence / decision |
|---|---|---|
| Design and privacy boundary | design complete; isolation decision pending | Obsidian inspected with Computer Use; architecture and ADRs recorded. See ADR 003 for shared-origin review. |
| Local storage and autosave | implemented and tested | Native disk write/conflict demonstrated; recovery and concurrency regressions added. |
| Markdown editor and links | implemented and tested | Source/live/reading, wiki and standard links; pointer/task/reference/footnote and selection regressions passed. |
| Graph and workspace | implemented; visual follow-up in progress | Drag/filter/settings/prefix/themes/panels exercised; missing and ambiguous links corrected. |
| Local milestone verification | passed at integration milestone | 42 tests, check/build, native folder autosave/conflict and responsive QA. |
| GitHub Pages milestones | multiple candidates deployed and tested | Actions 34417660613 published eaeadfa; real-browser build identity and update verified. Earlier public synthetic folder autosave and resource-barrier observations are recorded separately. |
| Final verification and release | awaiting owner decisions after final visual fixes | Dedicated hostname and published author-metadata remediation are unresolved. No completed-goal claim. |

No private reference screenshots or machine-specific paths are tracked. Temporary QA artifacts are ignored.

Design gap review complete: readonly capability typing, revisions, refresh, recovery identity, canonical parsing, external links, asset validation, prefix precedence, graph timeline and Pages update rules made explicit in architecture.md. User preauthorized the execution transition.

2026-09-10 integration milestone: feature commits fbb7c08 → 1f29b94 → 7154ad1 → d1ebfb8 pushed after local checks (42 tests). Pages Actions run 34413027854 succeeded; public welcome screen shows matching build SHA. Final review runs against d1ebfb88799d3c8372bb506db581a1bc57c6f93c in an isolated review checkout. See [release milestone](releases/0.1.0.md).

0.1.1-rc.1 preparation: 56 tests plus check/build passed. Editor, recovery, graph-navigation and bundled-theme findings were fixed in coherent commits after local browser verification. Public tag deployment policy now allows `v*` tags as well as main. Final privacy acceptance remains pending the dedicated-origin and published-metadata decisions; no final PASS or goal completion has been recorded.

0.1.1-rc.2: cursor-only preview remounting and remaining parsed-source offsets corrected; compact inspector close/resize corrected. Local test count is now 60, with clean check/build and real-browser regressions. Waiting-worker activation was exercised successfully with saved synthetic content retained. The source tree contains no machine-specific paths or private email strings; initial author metadata remains a separate pending history decision.
