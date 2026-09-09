# Versioning and releases

SemVer in package.json: patch fixes, minor additive functions/theme tokens, major incompatible public schemas. Theme schema has its own integer `version: 1`. Lockfile belongs to source control. Every release has a git tag `vX.Y.Z`, a release wiki page, build commit embedded in UI, and test/deployment evidence. Release evidence can name the prior tested commit; do not attempt a self-referential commit hash.

Commit style for this new repository: Conventional Commits, small feature/coherent fix groups. Push `main` after local checks. GitHub Actions publishes on manual dispatch or version tags, so documentation pushes cannot bypass the local release gate. Large feature milestones are deployed and browser-tested. Never force push published history. Rollback: deploy a known tested tagged commit; do not touch user's files or clear recovery data.

Initial design baseline: no commits existed at discovery. Subsequent concrete hashes are recorded in [execution](execution.md) and release pages.
