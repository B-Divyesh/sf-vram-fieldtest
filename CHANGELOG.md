# Changelog

## Unreleased

## 0.1.10 — 2026-08-30

- Report selected-adapter thermal readiness during `inspect`, for every vendor.
- Block non-NVIDIA adapters before test-memory allocation when temperature data is missing.
- Limit release and coverage wording to package checks and user-provided runs.
- Present unsigned Windows and macOS packages as checksum-verified, not publisher-signed.

## 0.1.9 — 2026-08-30

- Publish a candidate-matched release identity and block stale tag/site pairs.
- State precisely that the CLI detects and tests the user's host and that coverage evidence comes from completed user runs.
- Keep Windows and macOS downloads explicitly unsigned; checksum verification is not code signing.
- Keep Report Kit checkout fail-soft until an operator configures its Sociobot product mapping.

## 0.1.8 — 2026-08-30

- Rename preview output from `coverage_percent` to `requested_percent` so only completed reports carry a coverage value.

## 0.1.7 — 2026-08-29

- Make `inspect` explicitly host-local: it reports only the adapters and VRAM values exposed where the command runs.
- Report coverage only after all three patterns complete in the saved run; incomplete reports leave coverage unavailable.
- Remove synthetic high-memory plans from release provenance and label release protocol records as software-renderer smoke evidence.

## 0.1.6 — 2026-08-29

- Refuse hardware stress without temperature data for the selected adapter.
- Stop safely if selected-adapter temperature data disappears during a run.
- Read macOS memory capacity from Metal's recommended working-set size.
- Repair disclosure focus rings and small touch targets.
- Register and test the remaining user-facing safety claims.

## 0.1.5 — 2026-08-29

- Parse minified GitHub commit responses before installing a release.
- Require both the deployed tag and source commit to match the download.

## 0.1.4 — 2026-08-29

- Retain distinct GPU allocations through all three memory checks and report only commonly completed memory.
- Enumerate selectable adapters and the memory values their local drivers expose.
- Stop automatic tests when a memory total is unavailable instead of substituting a small default.
- Isolate demo license storage, improve report-file recovery, and restore 44 px download targets.
- Add software-renderer retained-allocation smoke records to the release workflow.

## 0.1.3 — 2026-08-29

- Tie every offered download to the exact deployed source commit.
- Build release archives deterministically so package checksums are committed before the release tag.
- Keep manual workflow runs as non-publishing package rehearsals.

## 0.1.2 — 2026-08-29

- Add local request planning and windowed report fields to the CLI.
- Reject stale release metadata before offering a download.
- Enforce a server-side license-check allowance with 429 and `Retry-After`.
- Return a real HTTP 404 for unknown routes while keeping every public route reloadable.

## 0.1.1 — 2026-08-28

- Add the synchronized npm lockfile and a clean-install regression gate.
- Add browser, mobile, keyboard, accessibility, offline, privacy, and installer checks.
- Repair the retired macOS x64 release runner and publish complete package checksums.
- Add the licensed local Report Kit page for printable covers and batch labels.

## 0.1.0 — 2026-08-28

- First bounded WebGPU memory pattern test with local JSON and HTML reports.
- Bundled CLI and web demo.
- Static cassette-era zine landing site and release workflow.
