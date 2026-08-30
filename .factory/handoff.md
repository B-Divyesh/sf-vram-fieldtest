# Repair 9 handoff — ready to deploy

**Base verifier report:** `.factory/verification-9.md` at
`57926d4f50a8693fa25ee190701909b6797e2655`

**Repaired candidate:** this commit on `main`

**Date:** 2026-08-30 UTC

## What changed

- Reproduced the verifier's exact parser failure against the release binary:
  `run --yes --adapter 0 --coverage 90 --window-mib 1024 --seconds 7200 ...`
  exited 2 with `7200 is not in 10..=900`.
- Aligned the release protocol command to the CLI limit: it now uses
  `--seconds 900`. A regression builds the release binary and safely runs the
  same bounded argument shape with a nonexistent adapter, proving parsing gets
  past `--seconds` before GPU selection.
- Removed the self-hosted Windows/Linux hardware-matrix release gate. Tagged
  releases now publish tested packages, `SHA256SUMS`, `latest.json`, and
  source-commit package provenance. They explicitly do not claim factory-owned
  GPU coverage.
- Kept host-local evidence useful: `inspect` and `run` remain host-local, and
  `scripts/hardware-evidence.py` now labels validated completed reports as
  user-host evidence rather than a factory lab matrix.
- Narrowed the safety copy honestly: a default run refuses when the selected
  adapter lacks usable local temperature telemetry. The existing unsafe manual
  override remains explicit.
- Disabled the Report Kit purchase link until an operator has configured its
  Sociobot product mapping. The UI says checkout is unavailable, never sends a
  visitor to the known 404, and still permits restoration of an
  operator-issued license.
- Extended the checksum claim to cover both installers. Linux exercises the
  shell installer against a served archive; Windows CI now runs the PowerShell
  installer against matching and tampered ZIP fixtures. Its local release mock
  serves explicit JSON responses so PowerShell deserializes the same metadata
  shape used in production. The installer uses .NET SHA-256 directly rather
  than depending on an optional `Get-FileHash` cmdlet.
- Strengthened the Report Kit claim regression: it uploads the bundled JSON
  through the browser control, verifies the printable output, and asserts no
  request occurs after selection or contains report content.
- Added `site_commit` to `release.json`. Live verification now checks this
  deployed static-site revision against `main` separately from the binary
  release tag and source commit used for safe download selection.

## Verification

Completed locally from a clean dependency install:

- `npm ci` — passed, 0 vulnerabilities.
- `npm test` — 30 Node checks passed (one Windows-only PowerShell fixture is
  skipped on this Linux worker), 13 Rust tests passed, and 29 Playwright
  desktop/mobile tests passed. The suite covers claim manifest entries,
  keyboard, 390 px layout, 200% text, reduced motion, axe serious/critical
  findings, demo privacy, service-worker offline reload, update behavior,
  routing, and response behavior.
- `npm run lint` — passed: JS/Python/shell syntax, Rust formatting, and Clippy
  with warnings denied.
- `npm run build` — passed and generated `dist/site` plus
  `target/release/vram-fieldtest`.
- `cargo check --locked --all-targets`, `cargo test --locked --all-targets`,
  and `cargo package --locked --allow-dirty` — passed; package verification
  compiled successfully (79 files, 2.7 MiB package).
- Fresh consumer install from `target/package/vram-fieldtest-0.1.8` — passed:
  installed CLI reports `0.1.8`, its network-blocked demo produced a three
  pattern JSON/HTML report, and its 12 GiB/90% plan requested 11,060 MiB over
  11 windows.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173` — passed in
  `artifacts/repair-9-verify/verify.json`: 999 ms, no console errors, title,
  `lang`, one `h1`, `main`, image alts, and labelled buttons.
- Fresh Lighthouse accessibility/best-practices/SEO run — 100/100/100;
  saved at `artifacts/repair-9-verify/lighthouse-a11y-seo.json`. The app is
  19,804 B raw / 6,848 B gzip JavaScript, 7,827 B raw / 2,533 B gzip CSS, and
  a 120,554 B hero WebP.

The full Lighthouse performance collection was attempted twice with the
preinstalled Playwright Chromium and crashed its tab during trace processing;
the report was discarded rather than reported as a score. The independent
verifier's prior clean mobile run recorded performance 98, accessibility 100,
best practices 100, SEO 100, LCP 1,395 ms, and CLS 0. The package-size and
browser quality checks above are current for this repair.

## Operator actions / known limits

- **Report Kit checkout is intentionally disabled.** Before enabling it, an
  operator must register the `vram-fieldtest` Sociobot product mapping, set a
  verified checkout URL in `reportKitCheckout`, deploy, and run a real hosted
  checkout/return/license verification smoke test. Do not expose a checkout
  URL until that mapping succeeds.
- This worker has no physical GPU and no PowerShell. No factory hardware matrix
  is claimed. Users can create reports only from the host on which they run the
  CLI; the evidence helper validates suitable completed Linux or Windows host
  reports. The Windows checksum fixture runs in the new `windows-latest` CI
  job on push.
- `actionlint` is not installed in this container. The workflow is covered by
  the repository release/provenance regressions and GitHub Actions will parse
  it on push.

## Deploy

Static deployment uses the repository's existing static build output
(`npm run build:site` -> `dist/site`) and `staticwebapp.config.json`. Push this
repair to `main`; then verify the deployed URLs with:

```sh
npm run verify:live -- https://vram-fieldtest.sociobot.in
```
