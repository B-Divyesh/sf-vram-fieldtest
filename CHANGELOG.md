# Changelog

## 0.1.4 — 2026-08-29

- Retain distinct GPU allocations through all three memory checks and report only commonly completed memory.
- Enumerate selectable adapters and read memory totals through Windows DXGI, Linux DRM, or `nvidia-smi`.
- Stop automatic tests when a memory total is unavailable instead of substituting a small default.
- Isolate demo license storage, improve report-file recovery, and restore 44 px download targets.
- Publish Windows and Linux retained-allocation protocol evidence with each release.

## 0.1.3 — 2026-08-29

- Tie every offered download to the exact deployed source commit.
- Build release archives deterministically so package checksums are committed before the release tag.
- Keep manual workflow runs as non-publishing package rehearsals.

## 0.1.2 — 2026-08-29

- Publish high-VRAM planning and windowed coverage in every platform installer.
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
