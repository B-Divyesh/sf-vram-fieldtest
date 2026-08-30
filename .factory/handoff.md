# Verification 9 handoff — FAIL

**Candidate:** `1b6af13e1e427d9445b4383bc894d71fd22329bc`

**Live URL:** <https://vram-fieldtest.sociobot.in>

**Date:** 2026-08-30 UTC

**Full report:** `.factory/verification-9.md`

## Decision

**FAIL — do not accept or release.** The site and local package are healthy,
but the acceptance contract is not complete.

## Release blockers

- **P0:** physical Linux and Windows workflow jobs use `--seconds 7200`, while
  the packaged CLI accepts only `10..=900`. The exact workflow command exits 2
  before GPU access, so the new release gate cannot ever produce evidence.
- **P0:** latest release `v0.1.8` still has only 4 MiB software-renderer smoke
  records, with null detected VRAM/coverage/telemetry. No physical evidence
  files exist, the repository has zero self-hosted runners, and the required
  >=90% Windows/Linux matrix remains unproven.
- **P1:** the live **Buy Report Kit** link returns HTTP 404 JSON
  `{"error":"enabled factory product","status":404}`. Purchase is impossible.
- **P1:** safe telemetry is unavailable for modern macOS GPUs and non-NVIDIA
  Windows GPUs; those users must choose the explicitly unsafe thermal override.
- **P1:** the PowerShell checksum promise and Report Kit “contents stay in this
  browser” promise are not fully represented by observable claim tests.

## What passed

- Cold first read and visible one-click sample demo at desktop and 390×844.
- All 26 exact claim commands after `npm ci`.
- `npm test`: 28 Node/integration, 13 Rust, 29 Playwright tests.
- `npm run lint`, `npm run build`, `cargo test/check --locked --all-targets`,
  and `cargo package --locked --allow-dirty`.
- Clean consumer install, CLI demo/report output, normal/boundary/invalid and
  consent/recovery paths, live shell installer, and release checksum.
- All served site files match the fresh candidate build; routes, true 404,
  keyboard focus, 390px layout, reduced motion, axe, offline reload, service
  worker update, console, privacy request log, security headers, and caching.
- Lighthouse: 98 performance, 100 accessibility, 100 best practices, 100 SEO;
  LCP 1,395 ms and CLS 0.
- Live license limit: eight 200 responses, then 429 with `Retry-After: 599` and
  `Cache-Control: no-store`.

## Reproduce the decisive P0

```sh
npm ci
npm run build
target/release/vram-fieldtest run --yes --adapter 0 --coverage 90 \
  --window-mib 1024 --seconds 7200 --output /tmp/evidence --json
```

Expected current result: exit 2 because 7200 is outside `10..=900`.

## Required next actions

1. Align the workflow duration with the CLI and test the packaged workflow
   command, not only workflow text.
2. Add the two physical runners and publish validator-approved Windows/Linux
   >=90% evidence in a new release.
3. Enable the Sociobot checkout product and verify the purchase redirect.
4. Close the cross-platform telemetry and claim-coverage gaps.

No product code, deployment, DNS, billing, or infrastructure was changed by
this verification.
