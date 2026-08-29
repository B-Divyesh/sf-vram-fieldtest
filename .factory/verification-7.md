# Independent verification 7 — FAIL

**Candidate:** `c1d11f2023a9435a3ec0626fc62dd3c4a996e6e8` (`main`)  
**Live URL:** <https://vram-fieldtest.sociobot.in>  
**Verified:** 2026-08-29 UTC

## Verdict

**FAIL — do not accept/release as satisfying the researched brief.** All
automatable checks, the safety repairs, the demo, package, and live deployment
are healthy. The one remaining blocker is the central acceptance measure: no
published or freshly executed physical Windows or Linux GPU run proves that the
tool can complete and report at least 90% of *detected* VRAM. The only two
published cross-platform runs use a 4 MiB software renderer; their detected
memory totals and coverage are null. A 96 GiB `plan` result proves allocation
arithmetic, not GPU allocation/write/read-back behavior.

This is a release-blocking **P0 evidence gap** under the brief's success
measure and the factory's requirement that the real job work end to end. It is
not a newly observed regression in the repaired code.

## Required gates first

### Cold first read and demo — PASS

A fresh desktop load returned 200 with title `VRAM Field Test — Test GPU
memory` and first-screen text:

- What: “Test GPU memory before money changes hands.”
- Who: “For buyers, resellers, and repair benches who need a clear memory test
  record.”
- First action: visible “Try it with sample data,” followed by “See a finished
  report and the exact test limits.”

The one-click demo displays a filled Example GPU 12 GB report, and `/demo`
shows the persistent “Demo — sample data, nothing is saved” banner with Reset
demo and Start for real. This passes the plain-words and demo-sandbox gates.

### Claims — PASS

`.factory/claims.json` exists and has 26 entries. From the clean checkout,
after `npm ci`, I invoked every listed exact command
`npm test -- --grep @claim:<id>` independently. All passed. A confirming full
`npm test` passed all 26 Node/integration tests, 12 Rust tests, and 28
Playwright tests; it includes each of the 26 tagged claims exactly once.

## Clean-checkout quality evidence — PASS

- `npm ci`: passed (5 packages; 0 reported vulnerabilities).
- `npm test`: passed: 26 Node/integration, 12 Rust, 28 Playwright tests.
- `npm run lint`: passed: JS/shell syntax, Rust formatting, and Clippy with
  warnings denied.
- `npm run build`: passed; generated `dist/site` and
  `target/release/vram-fieldtest`.
- `cargo test --locked --all-targets`: 12 passed.
- `cargo package --locked --allow-dirty`: passed and verified a 69-file,
  1.6 MiB package.
- Clean consumer: `cargo install --locked --path
  target/package/vram-fieldtest-0.1.6 --root <fresh-temp-dir>` passed; installed
  `vram-fieldtest 0.1.6` ran `demo --json` successfully.

## CLI and release exercise — PASS, except physical-matrix evidence

I downloaded GitHub release `v0.1.6`'s Linux archive and validated it with the
published `SHA256SUMS`. The archive's binary reported 0.1.6, showed useful
`--help`, and its `demo --json` wrote local `report.json` and a 2,000-byte
printable `report.html`.

- `plan --detected-mib 98304 --coverage 90 --window-mib 16384 --json` returned
  88,474 MiB, six windows, and 90.0004% planned coverage.
- The 1 MiB boundary returned one window and 100% coverage.
- `--detected-mib 0`, `--coverage 101`, and a real run without `--yes` failed
  with clear recovery guidance; no-consent exit was 1 before adapter opening.
- This verifier has no GPU (`inspect --json` returned `[]`); a consented run
  with adapter 0 failed safely with “Adapter 0 is not available.”

Published `PROVENANCE.json` identifies source
`2a23a4b55a48fcffcf79e0209a9c566e13097a4f` and shows Linux and Windows
software-renderer protocols with `tested_mib: 4`. It does **not** contain a
physical adapter's non-null detected-VRAM/coverage result. The live release
identity reports the same tagged source. Candidate `c1d11f2` is a descendant
whose only change is handoff documentation, so all generated site files are
still byte-for-byte equal to the candidate build; the identity difference is
not a deployment mismatch.

## Live deployment, privacy, accessibility, and performance — PASS

`npm run verify:live -- https://vram-fieldtest.sociobot.in` passed. Landing,
Demo, Report Kit, Privacy, Terms returned 200; the deliberately missing route
returned 404. Every route had one h1, main, `lang=en`, a title, no browser
console/page errors, and zero Axe serious/critical issues.

- Desktop keyboard check passed: Tab reaches Skip to content and Enter moves
  focus to main. The suite also covers route focus, Back, disclosure
  Enter/Space, 44px targets, and focus-ring contrast.
- At 390×844, the landing had no horizontal overflow and the first action was
  49.5px tall. Demo controls were at least 44px in both dimensions.
- Reduced motion had auto scrolling and no body animation/transition.
- `/demo` requested only its same origin (document, CSS, and JS); no telemetry,
  third-party fonts, or scripts were observed. Offline reload worked after
  service-worker control; active worker was `/sw.js`.
- Direct response headers included CSP, HSTS, `X-Content-Type-Options:
  nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. Hashed JS
  was `public, max-age=31536000, immutable`; `sw.js` was `no-cache`; and
  `release.json` was `no-store`.
- Initial JS is 19,261 raw bytes; all JS/CSS gzip to 10,052 bytes. CSS is
  7,827 raw bytes and the decorative hero is 120,554 bytes, each within the
  stated static-product budgets.
- I compared live and freshly built hashes for landing, Demo, Report Kit,
  Privacy, Terms, 404, `release.json`, worker, app JS, CSS, and mobile CSS.
  Every pair was identical.

## License endpoint allowance — PASS

Against `/api/license/verify` from one client with nine distinct invalid
tokens, requests 1–8 returned `200`/`{valid:false,reason:"invalid"}` and
`Cache-Control: no-store`. Request 9 returned `429`,
`{valid:false,reason:"rate_limited"}`, `Retry-After: 598`, and `no-store`.
Observed allowance: **eight checks per network address per rolling ten
minutes**. There is no sign-in flow, so the Entra tenant requirement does not
apply.

## Required next step

Run the tagged 0.1.6 binary on a physical Windows GPU and a physical Linux GPU
with reported VRAM. Keep the default target, preserve the completed JSON/HTML
reports and checksums, and publish evidence showing non-null detected memory,
at least 90% completed coverage, all three patterns, selected-adapter thermal
telemetry, and reproducible output. Re-run independent verification after that
evidence is attached.
