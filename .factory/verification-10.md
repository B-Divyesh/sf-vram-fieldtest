# Independent product verification 10 — FAIL

**Candidate:** `e59f8e1d7e09a6f419653e0de3f5ddd349f3700c` (`main`)

**Live URL:** <https://vram-fieldtest.sociobot.in>

**Verified:** 2026-08-30 UTC

**Work order:** `vram-fieldtest-verify-10`

## Verdict

**FAIL — do not release this candidate.**

The site, packaged CLI demo, claims suite, local quality gates, browser
experience, privacy behavior, and rate limiter are healthy.  The candidate
still misses the researched brief's release-critical outcome: a reproducible
completed report covering at least 90% of detected physical VRAM on both
Windows and Linux.  It also does not have a published release made from this
candidate commit.

## Release-blocking findings

### P0 — no physical Windows/Linux 90% coverage evidence exists

The brief's success measure requires a Windows and Linux test matrix that
reports usable coverage for at least 90% of detected VRAM.  Freshly downloaded
release evidence for the current `v0.1.8` does not meet that measure:

- `protocol-linux.json` identifies `llvmpipe (LLVM 20.1.2, 256 bits)`,
  `device_type: software`, 4 MiB tested, `detected_vram_mib: null`,
  `coverage_percent: null`, and no temperature or clock readings.
- `protocol-windows.json` identifies `Microsoft Basic Render Driver`,
  `device_type: software`, with the same 4 MiB/no-detected-VRAM/no-coverage
  result.
- Both records explicitly say `software-renderer smoke only; not a physical
  VRAM run`.  Neither is evidence for a GPU buyer, reseller, or repair bench.
- Candidate README/workflow text now explicitly says it does **not** claim a
  factory Windows/Linux hardware matrix.  That is more honest, but it does not
  satisfy the original researched acceptance contract.

The implementation has an additional cross-vendor limitation: selected-card
telemetry is NVIDIA `nvidia-smi` on all platforms plus Linux DRM sysfs.  There
is no macOS provider and no non-NVIDIA Windows provider.  In those cases a
normal run refuses before testing unless the user takes the documented unsafe
`--allow-no-thermal-stop` override.  This prevents a safe default run with
thermal/clock capture across the intended vendors/platforms.

### P0 — the published installer release is not this candidate

`origin/main` and the deployed static site's `site_commit` are
`e59f8e1d7e09a6f419653e0de3f5ddd349f3700c`.  The only published tag the site
offers, `v0.1.8`, resolves to the older ancestor
`f5bec7de1409eb24feb8773f8c23c9949819da54`:

```json
{
  "tag": "v0.1.8",
  "source_commit": "f5bec7de1409eb24feb8773f8c23c9949819da54",
  "site_commit": "e59f8e1d7e09a6f419653e0de3f5ddd349f3700c"
}
```

The published protocol artifacts also retain the old 120-second workflow
configuration; the candidate workflow has a 900-second configuration and
different provenance behavior, neither of which is represented by a tagged
release.  Candidate `e59f8e1` retains version `0.1.8`, so its revised release
workflow cannot create a distinct matching `v0.1.8` release.  The web shell is
deployed from the candidate (built `install.sh`, `install.ps1`, `release.json`,
JS, and CSS matched the live bytes), but the installable product's release
provenance is a mixed revision.  This fails the required live/candidate match.

### P1 — installers are explicitly unsigned

The researched smallest useful product calls for signed CLI installers.
README and the landing page state that Windows and macOS packages are
unsigned; the release workflow has no signing/notarization step.  SHA-256
verification is present and tested, but it is not a signed installer chain.

### P1 — one-time paid Report Kit is not purchasable

The researched opportunity specifies one-time monetization.  The live page
correctly avoids the former broken checkout, but it now says checkout is not
available until an operator configures a mapping.  No hosted purchase can be
completed for Report Kit.

## Mandatory first-read and demo gate — PASS

A brand-new Chromium context opened the live landing page cold.

- **What it does:** “Test GPU memory before money changes hands.”
- **For whom:** “buyers, resellers, and repair benches who need a clear memory
  test record.”
- **What to click first:** **Try it with sample data** — “See a finished
  report and the exact test limits.”

The one-click action was visible in the first 390×844 viewport and opened the
filled sample report.  Demo mode showed “Demo — sample data, nothing is
saved,” Reset demo, and Start for real.  Start for real removed the demo
storage namespace.

## Claims gate — PASS

The checkout was clean at the requested commit.  After the necessary locked
`npm ci`, I executed every exact `test` command in `.factory/claims.json`
sequentially through the product's demo entry point.  All 27 passed:

`demo-report`, `demo-sample`, `sample-equality`, `cli-local`,
`report-output-path`, `non-invasive`, `unsigned-builds`, `no-account`,
`safety-consent`, `host-vram-inspection`, `completed-run-coverage`,
`selected-thermal-stop`, `bounded-stop-report`, `mismatch-exit`,
`installer-checksum`, `release-download`, `site-offline`, `demo-privacy`,
`mobile-first-action`, `route-metadata`, `report-kit-output`,
`report-kit-operator-gate`, `license-storage`, `license-rate-limit`,
`unlock-allowance`, `release-package-provenance`, and
`host-evidence-bundle`.

Manifest/source cross-check: 27 claims; no missing, extra, or duplicate
`@claim:<id>` tags.  Passing tests do not replace the absent physical hardware
evidence above.

## Clean-checkout quality gates — PASS

- `npm ci` — passed; 5 packages, 0 vulnerabilities.
- `npm test` — passed (Node/integration checks, 13 Rust unit tests, and the
  Playwright desktop/mobile suite).
- `npm run lint` — passed JavaScript/Python/shell syntax, Rust format, and
  Clippy with warnings denied.
- `npm run build` — passed and produced `dist/site` (244 KiB total) plus
  `target/release/vram-fieldtest`.
- `cargo package --locked --allow-dirty` — passed; 79 files, 2.7 MiB package.

## CLI and installer exercise — PASS within this GPU-free verifier

I unpacked the `cargo package` artifact into a fresh temporary consumer and
installed it with `cargo install --locked --path ... --root ...`.  The installed
binary reported `vram-fieldtest 0.1.8`.

- `demo --json` succeeded with proxy variables pointed at a failing local port
  and wrote a pass JSON/HTML pair in a temporary directory.
- `inspect --json` returned `[]` on this GPU-free host.
- 12,288 MiB at 90% planned 11,060 MiB over 11 windows; 98,304 MiB at 90%
  planned 88,474 MiB over six windows.
- A run without `--yes` exited 1 before adapter access; `--detected-mib 0`
  was rejected with exit 2; a nonexistent selected adapter returned a useful
  exit-1 recovery message.
- The live Linux installer, redirected to a fresh temp directory, verified
  the release SHA-256, installed the binary, and its network-blocked demo
  passed.  The downloaded Linux archive independently matched `SHA256SUMS`.

No physical GPU was available in this verifier.  I therefore make no physical
VRAM coverage claim.

## Live web, privacy, accessibility, and performance — PASS

- `npm run verify:live -- https://vram-fieldtest.sociobot.in` passed: `/`,
  `/demo`, `/report-kit`, `/privacy`, and `/terms` returned 200; an unknown
  route returned a real 404; each checked route had zero serious/critical axe
  findings, and no console errors.
- `/opt/fleet/lib/verify-url.sh` passed against the live root: 727 ms load,
  title, `lang=en`, one h1, main landmark, complete image alts, labelled
  buttons, and no console errors.
- Keyboard Tab reached the skip link, navigation, primary action, disclosure,
  and links.  Each inspected focus target had a visible 4px orange outline.
- At 390×844 there was no horizontal overflow (`scrollWidth == clientWidth ==
  390`); the primary landing action was 49.5 CSS px high.  With reduced motion,
  `scroll-behavior` was `auto`, animation was `none`, and transition duration
  was `0s`.
- A fresh `/demo` context made only same-origin requests (document, local CSS,
  and local JS).  After service-worker readiness, offline reload preserved the
  demo title, h1, and banner without errors.
- Cold landing requests used same-origin assets plus the documented GitHub API
  release metadata calls; no third-party scripts/fonts loaded.  The CLI demo
  was separately proven network-free by its claim test and proxy exercise.
- Headers include CSP with `frame-ancestors 'none'`, HSTS, `nosniff`, and
  strict-origin referrer policy.  Hashed JS/CSS are immutable for one year;
  `sw.js` is `no-cache`; `release.json` is `no-store`.
- Initial app JS is 19,804 bytes raw / 6,848 gzip; CSS is 7,827 bytes raw /
  2,533 gzip; hero WebP is 120,554 bytes — all within stated static budgets.

## Server allowance and storage boundary — PASS

Fresh live requests to `/api/license/verify` from one client returned eight
`200 {valid:false,reason:"invalid"}` responses.  Request nine returned
`429 {valid:false,reason:"rate_limited"}` with `Retry-After: 597`.  Observed
allowance: **8 checks per network address per 10 minutes**.  Demo mode stored
only its `demo:vram-fieldtest` marker in its isolated flow and made no license
verification request.

## Required next steps

1. Produce independently reviewable completed physical reports from actual
   Windows and Linux GPUs, each with detected VRAM, ≥90% completed coverage,
   all three patterns, and selected-adapter thermal/clock evidence.  Extend
   telemetry support or explicitly scope out unsupported adapters without an
   unsafe override.
2. Bump the version, tag the exact candidate, publish fresh all-platform
   release assets/provenance, and redeploy only after live identity and
   installer provenance point to that commit.
3. Sign/notarize the promised platform installers, or revise the researched
   product contract before release.
4. Configure the Sociobot product mapping and verify a real one-time Report
   Kit checkout if that paid feature remains in scope.
