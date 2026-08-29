# VRAM Field Test — repair handoff

## Status

Release-blocking findings from verifier report `6cbf589` are repaired and
verified. The released CLI source is commit
`e586f3759f878ea5897b1a0fdebab8aceee0e71d`, tagged `v0.1.2`. The production
site is <https://vram-fieldtest.sociobot.in>.

## Repairs

### Published CLI is the candidate CLI

- Released all Linux, Windows, Intel macOS, and Apple-silicon macOS archives,
  Linux `.deb`/`.rpm`, and macOS `.pkg` assets as `v0.1.2`.
- Added `PROVENANCE.json` and a `source_commit` field in `latest.json`.
- The release workflow now executes the exact 96 GiB plan against the staged
  Linux archive, publishes it, downloads it again, verifies SHA-256, repeats
  the plan, and compares provenance to `GITHUB_SHA`.
- The landing page and both one-line installers refuse stale release tags.
  They never offer the old `v0.1.1` binary under the `v0.1.2` site.
- Updated the repository Formula, Scoop, and winget manifests. Published the
  Homebrew tap Formula in commit `e4e8d828bd56c4a993fd70f3548578e8e67b3fc4`.
- Normalized Windows CRLF in the combined checksum workflow. The initially
  malformed `SHA256SUMS` asset was replaced in release `v0.1.2`; all eight
  listed payloads now pass `sha256sum -c`.

Public archive evidence:

```text
vram-fieldtest 0.1.2
requested_mib: 88474
coverage_percent: 90.00040690104166
windows: 6
source_commit: e586f3759f878ea5897b1a0fdebab8aceee0e71d
```

Release workflow: <https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33259097643>

### Server-side license allowance

- Browser verification now uses the same-origin managed function
  `/api/license/verify`; checkout remains on the required Sociobot billing
  endpoint.
- The function permits eight checks per source network address in a rolling
  ten-minute window. The ninth returns HTTP 429 with `Retry-After` and does not
  call the upstream verifier.
- Forwarded IPv4 source ports are normalized. This was verified against the
  real Azure ingress, which changes the forwarded port between requests.
- Privacy, Terms, README, and claims now state the exact allowance. The
  existing browser-side one-check-per-day cache and `Retry-After` hold remain.

Live sequence after deployment:

```text
requests 1–8: HTTP 200
request 9: HTTP 429, Retry-After: 596
request 10: HTTP 429, Retry-After: 596
```

### Real HTTP 404

- Removed the catch-all SPA navigation fallback.
- The build emits physical entry files for `/demo`, `/report-kit`, `/privacy`,
  and `/terms`, so direct loads and reloads still work.
- Azure `responseOverrides` serves the designed `404.html` with status 404.
- `GET /missing-page-live-smoke` and `HEAD /missing-page-repair-3` return 404;
  all documented routes return 200.

## Verification

Clean/local gates:

```sh
npm ci
npm test
npm run build
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo package --locked --allow-dirty
```

Results:

- clean install: 5 packages, 0 vulnerabilities;
- 15 Node/unit-integration regressions, 4 Rust tests, and 16 Playwright tests
  passed;
- production site and release binary built;
- strict formatting and Clippy passed with warnings denied;
- Cargo package verification passed: 52 files, 301.3 KiB;
- clean `cargo install --locked --path . --root <temp>` consumer passed
  `--version`, `demo --json`, the exact 96 GiB plan, invalid coverage recovery,
  consent refusal, and the no-adapter recovery message.

Release/package checks:

- GitHub Actions release `33259097643`: verify, Linux, Windows, both macOS
  builders, publish, and post-publish archive check passed.
- GitHub Actions clean build `33259079456` passed for the released source.
- Public `SHA256SUMS` validates all eight platform/package payloads.
- Linux and both macOS archives each contain the expected single binary;
  Windows ZIP contains `vram-fieldtest.exe`; Debian metadata reports version
  `0.1.2`, architecture `amd64`.
- The live shell installer verified the checksum, installed `0.1.2`, and the
  installed binary returned the exact six-window plan.
- The fresh live landing chose the real `v0.1.2` Linux archive with no console
  error.

Live browser/accessibility/privacy/offline checks:

- `/opt/fleet/lib/verify-url.sh`: 942 ms load, correct title and `lang`, one
  `<h1>`, `<main>`, no missing alt text, no unlabeled controls, no errors.
- Fresh desktop and 390×844 mobile browser runs: no console/page errors, no
  horizontal overflow, 49.5 px primary target, usable at 200% text size.
- Keyboard Tab reaches the skip link; Enter moves focus to `<main>`.
- Axe found zero serious or critical findings on `/`, `/demo`, `/report-kit`,
  `/privacy`, `/terms`, and the real 404 page.
- Demo traffic was same-origin only. A controlled offline reload retained the
  sample heading and persistent demo banner after service-worker activation.
- Lighthouse mobile: performance 100, accessibility 100, best practices 100,
  SEO 100; LCP 1,448 ms, CLS 0, total blocking time 75 ms.
- Initial gzip: JavaScript 6,108 B, CSS 2,431 B; hero WebP 120,554 B.
- Hashed assets return one-year immutable caching; `sw.js` returns `no-cache`.
  CSP, HSTS, `nosniff`, and strict-origin referrer headers are live.

## Reproduction and focused regressions

```sh
npm test -- --grep @claim:release-provenance
npm test -- --grep @claim:unlock-allowance
npm test -- --grep @claim:license-rate-limit
curl -I https://vram-fieldtest.sociobot.in/missing-page
```

## Known limits / operator action

- This worker has no usable physical GPU. The real-run path stopped safely with
  the documented adapter/driver recovery message; no hardware-matrix claim is
  made here.
- macOS and Windows artifacts are intentionally unsigned. The owner must
  complete winget submission. No signing certificates were provided.
