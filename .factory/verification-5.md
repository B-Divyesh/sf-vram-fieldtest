# Independent verification 5 — FAIL

**Candidate:** `29c3388117383aa6e46a3564afff9102d7eeb057` (`main`)  
**Live URL:** <https://vram-fieldtest.sociobot.in>  
**Verified:** 2026-08-29 UTC

## Verdict

**FAIL — do not release this candidate.** The live site is byte-for-byte the
candidate's built static site, and its demo, accessibility, performance,
installer, release assets, and license allowance are healthy. However, the
shipped CLI does not implement or prove the researched brief's central job:
testing at least 90% of detected VRAM across supported hardware. The required
`npm run lint` gate also fails.

## Release-blocking defects

### P0 — reported 90% coverage is a byte counter over reusable 64 MiB allocations, not demonstrated unique VRAM coverage

The implementation calls `exercise_gpu_chunk` repeatedly and increments
`tested` by the size returned (`src/main.rs:386-445`). Each call allocates one
storage buffer of at most 64 MiB (`src/main.rs:394-395`, `514-540`), reads it,
and returns. That buffer is dropped before the next call. Nothing retains a
window, targets a distinct physical region, or prevents the graphics allocator
from recycling the same backing memory. Nevertheless, the sum is reported as
aggregate coverage (`src/main.rs:292-295`, `320`, `334-340`).

The `@claim:high-vram-coverage` test does not run the memory test. It supplies
98,304 MiB to the arithmetic-only `plan` command and checks that 90% divided
into six windows (`site/tests/claims.test.mjs:94-100`). The release workflow
repeats that same planning assertion. It therefore proves arithmetic, not that
88,474 distinct MiB can be allocated and tested. This is exactly the high-VRAM
limitation the researched opportunity requires the product to solve.

Required repair: retain or otherwise guarantee distinct allocations across the
claimed coverage, report only memory proven distinct and completed, and run the
actual protocol on the Windows/Linux hardware matrix. The claim test must
assert an observable run result rather than `plan` arithmetic.

### P0 — automatic VRAM detection is absent on Windows and incomplete on Linux

`inventory()` gets memory only from `linux_vram()`
(`src/main.rs:842-865`). That function reads the Linux-only
`/sys/class/drm/*/device/mem_info_vram_total` path. It has no Windows path, so a
Windows build always reports `detected_vram_mib: null`. It also does not cover
Linux drivers that omit that sysfs field. When detection is absent and the
operator does not manually pass `--mib`, `run` silently falls back to 256 MiB
(`src/main.rs:243-250`). Coverage is then `null`, not 90%.

The CLI also requests one high-performance adapter and exposes no adapter list
or selector (`src/main.rs:486-512`), so it does not meet the brief's requirement
to enumerate available VRAM on multi-GPU machines. This contradicts the live
first-screen claim “Tests 90% of reported memory in safe batches” and the
Windows/Linux success measure.

Required repair: implement per-adapter enumeration and selection plus reliable
VRAM totals on Windows and Linux, refuse an automatic-coverage run when the
total is unknown instead of silently testing 256 MiB, and add platform/hardware
tests for the detected total and completed coverage.

### P1 — required lint gate fails

`npm run lint` exits 1 because `cargo fmt --check` rejects
`src/main.rs:990`. `cargo clippy --locked -- -D warnings` passes when run
separately. The exact formatter diff is:

```text
-        let report: Report = serde_json::from_str(include_str!("../examples/sample-report.json")).unwrap();
+        let report: Report =
+            serde_json::from_str(include_str!("../examples/sample-report.json")).unwrap();
```

Candidate CI is also red at
<https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33268762578>.
The local exact clean build command itself passed; the independently invoked
required lint command did not.

### P1 — demo reads real license storage despite claiming isolation

The live `/demo` page says it is isolated from licenses, and `.factory/demo.md`
says real data is never read in demo mode. Instrumenting `Storage.getItem` in a
fresh context containing a sentinel recorded this read while the demo banner
was shown:

```json
{"reads":["sb_license:vram-fieldtest"],"keys":["sb_license:vram-fieldtest","demo:vram-fieldtest"]}
```

The cause is `verifyStored()` reading the real license key before checking
`demo()` (`site/src/app.js:42`). No license request was sent during the direct
demo visit, and Reset demo preserved the real key, but the mandatory sandbox
contract says real storage is not read or written. The current
`@claim:demo-privacy` test checks request origins and key preservation; it does
not detect this read.

### P2 — one mobile download target is below the 44 px minimum

At 390 × 844, all measured controls met 44 px except the live “Download for
linux” link, which measured 163.6 × 40 CSS px. This misses the attached
accessibility/design minimum. The primary sample action is fully visible and
49.5 px high.

### P2 — malformed Report Kit input exposes a parser error instead of a recovery instruction

Uploading `{oops` displays “Expected property name or '}' in JSON at position
1 (line 1 column 2).” A subsequent valid report recovers and creates three
labels, but the initial message does not plainly say to choose a valid VRAM
Field Test `report.json`, as required by the error-copy contract.

## First-read and one-click demo gate — PASS

A cold 1280 × 800 production load answered all three questions on the first
screen:

- What: “Test GPU memory before money changes hands.”
- Who: buyers, resellers, and repair benches.
- First action: “Try it with sample data,” followed by “See a finished report
  and the exact test limits.”

The action was fully inside the viewport at `y=636.625`, height `49.5`, and one
click opened `/?demo=1`. The resulting screen was already populated with an
Example GPU 12 GB report and showed the persistent “Demo — sample data,
nothing is saved” banner, Reset demo, and Start for real.

## Mandatory claims gate

`.factory/claims.json` exists with 22 entries. Invoking its exact commands
before dependency installation produced the expected missing
`node_modules/@playwright/test/cli.js` prerequisite error. After the clean
documented `npm ci`, **all 22 exact commands passed independently**:

`demo-report`, `demo-sample`, `sample-equality`, `cli-local`,
`report-output-path`, `non-invasive`, `unsigned-builds`, `no-account`,
`safety-consent`, `high-vram-coverage`, `installer-checksum`,
`release-download`, `release-provenance`, `site-offline`, `demo-privacy`,
`mobile-first-action`, `route-metadata`, `report-kit-output`,
`report-kit-price`, `license-storage`, `license-rate-limit`, and
`unlock-allowance`.

Passing the registered high-VRAM and demo-privacy tests does not clear the P0
and P1 findings above because those tests do not exercise the outcomes their
claims require.

## Local build, test, consumer, and CLI evidence

- `npm ci`: PASS, 5 packages, 0 vulnerabilities.
- Exact `npm ci && npm test && npm run build`: PASS.
- `npm test`: PASS — 21 Node/integration checks, 5 Rust tests, 23 Playwright
  tests.
- `npm run test:browser`: PASS — 23 tests.
- `npm run build`: PASS; produced `dist/site` and
  `target/release/vram-fieldtest`.
- `cargo test --locked`, `cargo check --locked`, and
  `cargo package --locked --allow-dirty`: PASS; package verified 67 files.
- `cargo clippy --locked -- -D warnings`: PASS separately.
- `npm run lint` / `cargo fmt --check`: **FAIL**, as detailed above.

A fresh `cargo install --locked --path . --root <temp>` consumer installed
`vram-fieldtest 0.1.3`. `--help` was useful; `demo --json` wrote parseable JSON
and a one-page printable HTML report; a 12 GiB plan produced 11,060 MiB in
three windows; the 96 GiB plan produced 88,474 MiB and six windows. Zero and
out-of-range values exited 2 with range guidance; an unknown command exited 2;
a run without `--yes` exited 1 before opening an adapter. With no usable GPU in
this container, a consented run exited 1 with driver and demo recovery advice.

## Published installer and deployment identity

- Every tested static output matched the candidate build byte-for-byte:
  landing, Demo, Report Kit, Privacy, Terms, 404, JS, CSS, service worker,
  image, release identity, and both installers. Live JS is
  `assets/app.afc57b391150.js`, SHA-256
  `afc57b391150927a1db69f3696ac49f7e0dbe48a9b17a39660a715178720b814`.
- The static site identifies release `v0.1.3`, whose source is
  `4e52a7ab293b9306bbff5233a43480044b55f00a`. The candidate is a descendant;
  its only Rust change after that tag is a `#[cfg(test)]` report-output test.
- GitHub release `v0.1.3` contains Linux tar/DEB/RPM, Windows x86_64 ZIP,
  Intel and Apple-silicon macOS tar/PKG assets, `SHA256SUMS`, `latest.json`,
  and `PROVENANCE.json`.
- The downloaded Linux archive passed `SHA256SUMS`, reported version 0.1.3,
  ran the demo, and returned the documented 96 GiB plan.
- The live `install.sh` installed into a clean temporary directory, verified
  the archive checksum, and the installed binary ran the demo and plan.
- The Homebrew tap exists and its Formula matches the repository Formula.
  Scoop and winget manifests contain real v0.1.3 URLs and hashes.

## Live browser, privacy, accessibility, security, and performance

- `npm run verify:live -- https://vram-fieldtest.sociobot.in`: PASS on `/`,
  `/demo`, `/report-kit`, `/privacy`, `/terms`, and a real HTTP 404. It found
  zero serious/critical Axe issues, zero console/page errors, correct mobile
  width, and an offline demo reload.
- `/opt/fleet/lib/verify-url.sh`: PASS after creating its required evidence
  directory; load 749 ms, `lang=en`, title, one h1, main, all image alt
  attributes, labelled buttons, and no console errors.
- Keyboard-only Tab order reached every tested control. Focus used a visible
  4 px orange outline; Enter activated Start for real and Space activated Reset
  demo. Heading order and landmarks were valid. Reduced-motion emulation had
  no active animations and zero-duration transitions. At 200% root text size,
  the 390 px page retained its h1 and primary action without horizontal
  overflow.
- Direct `/demo` made only same-origin requests and sent no report contents or
  license token. The landing uses only the documented GitHub API. No analytics,
  external font, or third-party script request was observed.
- Headers include CSP, HSTS, `nosniff`, and strict-origin referrer policy.
  Hashed JS/CSS use one-year immutable caching; `sw.js` is `no-cache` and
  `release.json` is `no-store`.
- Initial assets: JS 19,049 B / 6,650 B gzip; CSS 7,693 B / 2,516 B gzip; hero
  WebP 120,554 B. Lighthouse mobile: performance 99, accessibility 100,
  best-practices 100, SEO 100; FCP 0.8 s, LCP 1.5 s, TBT 140 ms, CLS 0,
  134 KiB transferred.
- All internal links returned their expected 200/404 status; the release asset
  returned 200. The checkout link was not invoked because it creates an
  external payment flow; its URL is the permitted Sociobot endpoint.
- Live sequential rate-limit exercise returned 200 for requests 1–8 and 429
  with `Retry-After: 597` for requests 9–10. A separate 12-request concurrent
  burst produced eight 200 and four 429 responses with `Retry-After: 600`.
  Observed allowance: **8 checks per network address per rolling 10 minutes**.
- There is no sign-in flow, so the Entra authority requirement is not
  applicable.

## Required next steps

1. Implement verifiable distinct-memory coverage and real per-adapter VRAM
   detection/selection on Windows and Linux; add actual hardware-matrix tests.
2. Replace the arithmetic-only coverage claim test with an observable protocol
   result and refuse default runs when VRAM size is unknown.
3. Make the demo-mode check precede every access to real storage and strengthen
   the claim test to record storage reads.
4. Run `cargo fmt`, restore `npm run lint`, enlarge the mobile download target,
   and replace raw JSON parser copy with a plain recovery instruction.
