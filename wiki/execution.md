# Execution ledger

| Step | Status | Evidence / decision |
|---|---|---|
| Design and privacy boundary | complete for the requested GitHub.io deployment | Obsidian inspected with Computer Use; architecture and ADRs recorded. ADR 003 documents the shared-origin limitation and the accepted hosting choice. |
| Local storage and autosave | implemented and tested | Native disk write/conflict demonstrated; recovery and concurrency regressions added. |
| Markdown editor and links | implemented and tested | Source/live/reading, wiki and standard links; pointer/task/reference/footnote and selection regressions passed. |
| Graph and workspace | implemented and tested | Drag/filter/settings/prefix/themes/panels exercised; missing and ambiguous links corrected; both final visual passes approve. |
| Local milestone verification | passed at integration milestone | 42 tests, check/build, native folder autosave/conflict and responsive QA. |
| GitHub Pages milestones | multiple candidates deployed and tested | Actions 34417660613 published eaeadfa; real-browser build identity and update verified. Earlier public synthetic folder autosave and resource-barrier observations are recorded separately. |
| All-file links and final release | 0.2.0 deployed and publicly tested | 93 tests, check/build, scoped code review, both visual passes and public native-folder autosave/attachment navigation pass. See the 0.2.0 release record. |

No private reference screenshots or machine-specific paths are tracked. Temporary QA artifacts are ignored.

Design gap review complete: readonly capability typing, revisions, refresh, recovery identity, canonical parsing, external links, asset validation, prefix precedence, graph timeline and Pages update rules made explicit in architecture.md. User preauthorized the execution transition.

2026-09-10 integration milestone: feature commits fbb7c08 → 1f29b94 → 7154ad1 → d1ebfb8 pushed after local checks (42 tests). Pages Actions run 34413027854 succeeded; public welcome screen shows matching build SHA. Final review runs against d1ebfb88799d3c8372bb506db581a1bc57c6f93c in an isolated review checkout. See [release milestone](releases/0.1.0.md).

0.1.1-rc.1 preparation: 56 tests plus check/build passed. Editor, recovery, graph-navigation and bundled-theme findings were fixed in coherent commits after local browser verification. Public tag deployment policy now allows `v*` tags as well as main. Final privacy acceptance remains pending the dedicated-origin and published-metadata decisions; no final PASS or goal completion has been recorded.

0.1.1-rc.2: cursor-only preview remounting and remaining parsed-source offsets corrected; compact inspector close/resize corrected. Local test count is now 60, with clean check/build and real-browser regressions. Waiting-worker activation was exercised successfully with saved synthetic content retained. The source tree contains no machine-specific paths or private email strings; initial author metadata remains a separate pending history decision.

Latest candidate: `8b8bfae46f858c2315e66f6093662747071bb7b5` deployed by Actions 34419057017. 66 tests/check/build pass; public native file autosave, prefix command, graph zoom/Fit/list and update flow pass. Both independent visual passes approve the same fresh 27-frame set. Implementation work is complete; final release is waiting for owner-specific hostname and history decisions. Documentation-only commits do not change the tested deployed product source.

2026-09-12 supersedes the earlier owner-decision hold: the user confirmed the GitHub.io deployment. A dedicated hostname is optional additional isolation, and a rewrite of historical author metadata has not been requested. Neither is a prerequisite for this feature release. No published history was rewritten.

0.2.0 completed: storage indexing, root-link serialization and local attachment UI landed in separate commits, followed by a Korean IME normalization fix. Tag `v0.2.0` points to `5b65233b704b1b0bf375089f3db560998862901f`; Actions 34699162177 published it. Public Computer Use opened only a generated folder, observed two-to-seven-file discovery, followed attachment links from notes and the graph, and verified canonical wiki text automatically written to the original disk file. The public console was clean. Full test, review and deployment references are in [the release record](releases/0.2.0.md).
