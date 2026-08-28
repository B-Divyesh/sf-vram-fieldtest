# Independent verification — FAIL

Verified candidate: `99a70a94e075848ab3b33491a7bb287d095afec3`  
Live URL: <https://vram-fieldtest.sociobot.in>  
Date: 2026-08-28 UTC

## Decision

**FAIL — do not release this candidate.** The web deployment and packaging are
substantially healthy, but the CLI cannot meet the researched product's core
high-VRAM coverage requirement and does not capture the required thermals and
clocks. A required available lint gate also fails.

## First-read and demo gate

Cold-opening the live landing page answered all three required questions in
plain language:

- It tests GPU memory before a sale.
- It is for buyers, resellers, and repair benches.
- The first action is **Try it with sample data**, which opens `/demo` in one
  click.

The demo showed its persistent “Demo — sample data, nothing is saved” banner,
Reset demo, and Start for real controls. This gate **passed**.

## Claims — all passed

From this clean checkout, after `npm install`, every exact command listed in
`.factory/claims.json` passed:

| Claim | Command result |
| --- | --- |
| `demo-report` | PASS |
| `demo-sample` | PASS |
| `cli-local` | PASS |
| `safety-consent` | PASS |
| `safety-cap` | PASS |
| `installer-checksum` | PASS |
| `release-download` | PASS |
| `site-offline` | PASS |
| `demo-privacy` | PASS |
| `report-kit-output` | PASS |

`npm test` also passed: 9 Node/integration checks, 2 Rust unit tests, and 13
Playwright tests.

## Local build and CLI evidence

- `npm run build`: **PASS**. It produced `dist/site/` and
  `target/release/vram-fieldtest`.
- `cargo test --locked`, `cargo check --locked`, and `cargo fmt --check`:
  **PASS**.
- `cargo clippy --locked -- -D warnings`: **FAIL** (details below).
- CLI demo passed in a fresh consumer directory after downloading the released
  Linux archive. `SHA256SUMS` verified it; `./vram-fieldtest --version`
  printed `vram-fieldtest 0.1.1`; `./vram-fieldtest demo --json` wrote a local
  demo report.
- Boundary/recovery checks passed: `run --mib 0 --yes` and
  `run --mib 16385 --yes` exit 1 before GPU access; `run --mib 128` exits 1
  with the explicit-consent instruction; with no GPU available,
  `run --mib 128 --yes` exits 1 with a helpful adapter/driver recovery
  message. The container had no usable physical GPU, so a real hardware pass
  could not be performed.

## Live deployment, privacy, accessibility, and performance

- Candidate match: live `/`, `/app.js`, and `/styles.css` SHA-256 values
  exactly matched this candidate's `dist/site/` build.
- Routes `/`, `/demo`, `/report-kit`, `/privacy`, `/terms`, and the 404 route
  each returned 200, their expected title, one `<h1>`, and one `<main>`.
- Playwright found no console or page errors. Axe found zero serious/critical
  violations on all of those routes.
- At 390px the page had no horizontal overflow; the primary control measured
  252.7 × 49.5 CSS px. Keyboard Tab reached the skip link with a visible
  `rgb(184, 50, 18) solid 4px` focus outline. Reduced-motion emulation showed
  no running animations and `scroll-behavior: auto`.
- Live `/demo` made only same-origin document, CSS, and JS requests; it made
  no console/page errors. The landing release lookup used only the documented
  GitHub API.
- Browser headers include CSP, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and HSTS. No third-party
  fonts/scripts were loaded.
- Bundle evidence: `app.js` 5,503 bytes gzip; `styles.css` 2,418 bytes gzip;
  hero WebP 120,554 bytes.
- Release `v0.1.1` exists with Linux, Windows, Intel macOS, Apple-silicon
  macOS, `.deb`, `.rpm`, checksums, and `latest.json`. The Linux archive
  checksum verified successfully.

## Release-blocking defects

### P0 — Cannot meet the core 90% high-VRAM coverage success measure

The researched brief explicitly requires usable coverage for at least 90% of
detected VRAM and specifically cites the existing 20 GB limit on a 96 GB RTX
6000 PRO as the market gap. The candidate hard-caps every run at 16,384 MiB:
`src/main.rs:14`, validation at `src/main.rs:145`, and single-buffer selection
at `src/main.rs:152`. Therefore even under the most favourable driver limit,
a detected 96 GiB adapter can cover at most 16,384 / 98,304 = **16.67%**, not
90%. A lower WebGPU storage-buffer limit reduces it further. The sample's
93.75% result does not prove the required high-memory case.

This repeats the incumbent limitation the product was meant to solve. Implement
batched/windowed coverage across the reported VRAM and report aggregate tested
coverage, then prove at least 90% on a high-VRAM hardware matrix.

### P0 — Required thermal/clock capture and enforceable time limit are absent

The smallest useful product requires capture of thermals and clocks. The report
schema has only a thermal threshold (`Limits.thermal_limit_c`); no thermal
measurements or clocks are recorded. The report explicitly says they are not
available (`src/main.rs:193`). `gpu_temperature()` is NVIDIA-only and is used
only as a before/after guard. The `--seconds` limit is checked only before a
whole pattern (`src/main.rs:163`); the synchronous allocation, dispatch,
readback, and full CPU comparison in `exercise_gpu_buffer()` cannot be stopped
once started. Thus a long pattern can exceed the requested time bound. This
violates the brief's thermal/time-limit constraint as well as telemetry
capture.

### P1 — Available strict lint gate fails

`cargo clippy --locked -- -D warnings` fails at `src/main.rs:223` with
`clippy::manual_clamp` and at `src/main.rs:342` with
`clippy::manual_div_ceil`. The candidate therefore does not pass all available
quality checks.

### P1 — Product-unlock allowance is neither documented nor verifiable

The paid Report Kit calls
`https://api.sociobot.in/api/v1/products/vram-fieldtest/verify`. No
documented request allowance, 429 behavior, or `Retry-After` handling is
present in the repository. One invalid-token probe returned 200 JSON
`{"valid":false,"reason":"invalid"}` with no rate-limit headers. Because no
allowance is documented, it is not possible to test the required “past the
allowance → 429 with Retry-After” contract. Document and enforce the allowance
and add an observable integration test before release.

### P2 — Static assets miss the specified immutable-cache policy

Live `app.js`, `styles.css`, and the un-hashed shell assets all return
`Cache-Control: public, must-revalidate, max-age=30`, rather than long-lived
immutable caching for hashed assets. The service worker supports offline
reload, but this does not meet the stated caching policy.

## Non-blocking strengths

The landing and demo are unusually clear and usable. The release manifest,
checksums, one-click demo, offline route, privacy request log, mobile layout,
focus treatment, and tested local report output are all solid foundations.

## Required next steps

1. Remove the per-run 16 GiB ceiling by testing VRAM in bounded batches and
   aggregate the actual coverage; add high-VRAM hardware evidence for ≥90%.
2. Add cross-vendor thermal and clock samples to the JSON/HTML report and make
   the duration limit interrupt an in-flight pattern safely.
3. Resolve the two Clippy diagnostics and make strict Clippy part of CI.
4. Specify/test product-unlock request allowance, 429, and `Retry-After`.
5. Publish immutable hashed static assets (or document an equally safe update
   policy approved for this deployment).
