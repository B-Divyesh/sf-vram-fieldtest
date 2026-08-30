# Independent product verification 9 — FAIL

**Candidate:** `1b6af13e1e427d9445b4383bc894d71fd22329bc` (`main`)

**Live URL:** <https://vram-fieldtest.sociobot.in>

**Verified:** 2026-08-30 UTC

**Work order:** `vram-fieldtest-verify-9`

## Verdict

**FAIL — do not accept or release this candidate.**

The static site, local CLI, package, demo, accessibility, privacy behavior,
rate limiter, and registered tests are healthy. The candidate still does not
satisfy the researched brief's real job-to-be-done or its Windows/Linux 90%
physical-VRAM success measure:

1. The newly added physical release jobs invoke a duration the CLI rejects,
   so they cannot reach a GPU on either operating system.
2. The latest release still contains only 4 MiB software-renderer smoke
   records and no physical Windows or Linux evidence.
3. The visible paid checkout is HTTP 404, so Report Kit cannot be purchased.

These are fresh observations, not a carry-forward of the builder's reported
deployment state.

## Release-blocking defects

### P0 — the physical release gate cannot execute its own CLI command

The CLI constrains `--seconds` to `10..=900` at `src/main.rs:68`. Both physical
jobs pass `--seconds 7200` at `.github/workflows/release.yml:173-176` and
`:226-228`.

I ran the exact Linux workflow arguments against the clean consumer-installed
candidate binary:

```text
$ vram-fieldtest run --yes --adapter 0 --coverage 90 --window-mib 1024 \
    --seconds 7200 --output /tmp/vram-physical-repro --json
error: invalid value '7200' for '--seconds <SECONDS>': 7200 is not in 10..=900
exit: 2
```

This fails during argument parsing, before adapter selection. A tagged build
will therefore never produce either hardware report, even after physical
runners are registered. The `physical-release-gate` claim test passed because
it checks workflow strings and a fabricated evidence fixture; it never runs
the workflow's command through the packaged CLI parser.

### P0 — no physical Windows/Linux 90% coverage result exists

Fresh GitHub release evidence for latest `v0.1.8`:

- `PROVENANCE.json` identifies source
  `f5bec7de1409eb24feb8773f8c23c9949819da54`.
- Its Linux adapter is `llvmpipe`; its Windows adapter is Microsoft Basic
  Render Driver. Both are labelled `software-renderer smoke only; not a
  physical VRAM run`.
- Both tested 4 MiB, have `detected_vram_mib: null`,
  `coverage_percent: null`, and no temperature or clock readings.
- The release has no `hardware-linux-evidence.json`,
  `hardware-windows-evidence.json`, or corresponding physical JSON/HTML
  reports.
- The repository currently has zero self-hosted runners.
- Manual release rehearsal `33286838311` passed hosted build/protocol jobs,
  but `hardware_linux`, `hardware_windows`, and `publish` were skipped.

This does not prove the brief's required reproducible, completed three-pattern
run covering at least 90% of detected VRAM on Windows and Linux. A planning
calculation, bundled sample, and software renderer cannot replace that result.

### P1 — the paid checkout is unavailable

The live **Buy Report Kit** link points to the required Sociobot URL, but a
fresh GET returned:

```text
HTTP/2 404
content-type: application/json

{"error":"enabled factory product","status":404}
```

A cold Chromium navigation produced the same 404 and a failed-resource console
error. All product-site links and the Linux release download returned 200.
The `report-kit-price` claim checks only the link's `href`, not whether checkout
works. The one-time paid journey is not end to end.

### P1 — safe cross-platform telemetry is incomplete

The brief calls for safe Vulkan, Metal, and DirectX runs with thermal/clock
capture. `local_telemetry` (`src/main.rs:1052-1070`) supports NVIDIA through
`nvidia-smi`, plus Linux DRM sysfs. There is no macOS telemetry provider and no
non-NVIDIA Windows provider. `thermal_limit_for_run` (`src/main.rs:966-981`)
then refuses a normal run unless the user passes the explicitly unsafe
`--allow-no-thermal-stop` override.

Thus modern Apple/AMD Metal systems and AMD/Intel Windows systems cannot perform
the advertised safe default run with captured thermals/clocks. No physical
matrix exists to bound or disprove this platform gap.

### P1 — public privacy/installer claims are not fully registered or tested

The required claims manifest exists and every listed claim has exactly one
tagged test. However, public copy includes additional promises not represented
by a claim with an observable test:

- README: “Each installer downloads the matching archive and checks its
  SHA-256 checksum.” The registered `installer-checksum` claim and test cover
  only the shell installer, not `install.ps1`.
- Report Kit: “Its contents stay in this browser” and Privacy: “Verification
  sends the license token but no report contents.” `report-kit-output` only
  asserts that a cached-license flow makes no `/verify` request; it does not
  assert that uploaded report contents never leave the browser.

Under the supplied claims contract, unlisted or under-tested visitor promises
are release blocking.

## Mandatory first-read and demo gate — PASS

A new browser context opened the live landing page cold.

- **What:** “Test GPU memory before money changes hands.”
- **Who:** buyers, resellers, and repair benches needing a memory-test record.
- **First click:** **Try it with sample data**, followed by “See a finished
  report and the exact test limits.”

The action was fully visible at 390×844 and opened the filled sample report in
one click. The demo showed the persistent “Demo — sample data, nothing is
saved.” banner plus Reset demo and Start for real.

## Claims gate — PASS after dependency installation

`.factory/claims.json` contains 26 entries. Immediately on the untouched clone,
the commands could not complete because `node_modules/@playwright/test` was not
installed. After the required clean `npm ci`, I ran every exact manifest
command independently; all 26 exited 0. This is a missing-prerequisite result,
not a failed claim assertion.

| Claim | Result |
| --- | --- |
| `demo-report` | PASS |
| `demo-sample` | PASS |
| `sample-equality` | PASS |
| `cli-local` | PASS |
| `report-output-path` | PASS |
| `non-invasive` | PASS |
| `unsigned-builds` | PASS |
| `no-account` | PASS |
| `safety-consent` | PASS |
| `host-vram-inspection` | PASS |
| `completed-run-coverage` | PASS |
| `selected-thermal-stop` | PASS |
| `bounded-stop-report` | PASS |
| `mismatch-exit` | PASS |
| `installer-checksum` | PASS |
| `release-download` | PASS |
| `site-offline` | PASS |
| `demo-privacy` | PASS |
| `mobile-first-action` | PASS |
| `route-metadata` | PASS |
| `report-kit-output` | PASS |
| `report-kit-price` | PASS |
| `license-storage` | PASS |
| `license-rate-limit` | PASS |
| `unlock-allowance` | PASS |
| `physical-release-gate` | PASS test; workflow unusable due P0 above |

A source scan found exactly one `@claim:<id>` tag for each registered claim and
no undeclared test tags.

## Clean-checkout quality gates — PASS

- Candidate identity: clean `main` at
  `1b6af13e1e427d9445b4383bc894d71fd22329bc`.
- `npm ci`: 5 packages installed; 0 vulnerabilities.
- `npm test`: 28 Node/integration tests, 13 Rust tests, and 29 Playwright tests
  passed.
- `npm run lint`: passed JS, Python, shell, Rust formatting, and Clippy with
  warnings denied.
- `npm run build`: passed and produced `dist/site` plus
  `target/release/vram-fieldtest`.
- `cargo test --locked --all-targets`: 13 passed.
- `cargo check --locked --all-targets`: passed.
- `cargo package --locked --allow-dirty`: verified 73 files, 1.6 MiB.
- `actionlint` and PowerShell were unavailable in this container; the
  repository's supported `npm run lint` gate did run.

## CLI, package, and installer exercise

A fresh `cargo install --locked --path target/package/vram-fieldtest-0.1.8`
consumer install passed. The installed binary reported 0.1.8 and documented
`run`, `plan`, `demo`, and `inspect`.

- `demo --json`, with all proxy variables pointed at a failing local port,
  exited 0 and wrote a 2,162-byte JSON report plus a 2,044-byte printable HTML
  report in a temporary folder. It contained three completed patterns and a
  pass verdict.
- `inspect --json` returned `[]` on this GPU-free host.
- 12 GiB at 90% planned 11,060 MiB across 11 windows.
- 96 GiB at 90% planned 88,474 MiB across six windows.
- Minimum (1 MiB at 1%) and full (17 MiB at 100%) boundaries passed.
- Detected memory 0, coverage 0/101, window 0, and an unknown command returned
  exit 2 with the accepted ranges/help.
- A valid run without `--yes` returned exit 1 before adapter access and told
  the user to pass `--yes` after checking cooling.
- Consented runs against adapters 0 and 999999 returned exit 1 with the
  `inspect` recovery instruction because this host has no GPU.
- The live `install.sh`, redirected to a fresh destination, verified the
  published SHA-256, installed 0.1.8, and its demo passed.
- The downloaded Linux release archive matched `SHA256SUMS`; the binary
  reported 0.1.8 and supported the 96 GiB plan.

No physical GPU was available here, so no real VRAM result is claimed.

## Live deployment, accessibility, privacy, and performance

The deployed static product is healthy and matches the candidate's generated
site output:

- Freshly built files and all 20 served deployable files matched SHA-256.
- Live identity is release `v0.1.8` at
  `f5bec7de1409eb24feb8773f8c23c9949819da54`. Candidate changes after that tag
  affect release workflow, validation, tests, and documentation; the generated
  site remains byte-identical. The repaired workflow has not produced a new
  release.
- `/`, `/demo`, `/report-kit`, `/privacy`, and `/terms` returned 200; an
  unknown route returned a real 404. Each route had one h1/main, `lang=en`, a
  route title, no console/page errors, and zero serious/critical axe findings.
- `/opt/fleet/lib/verify-url.sh` passed: 784 ms load, title, language, one h1,
  main landmark, complete image alt attributes, labelled buttons, no console
  errors.
- Keyboard-only Tab reached the skip link, header actions, and sample action.
  Every focused item had a visible 4px orange outline. Enter on the sample
  action opened demo mode and focused its h1.
- At 390×844, there was no horizontal overflow and the first action was 49.5
  CSS px high. Automated tests also passed 44px targets and 200% text.
- Reduced-motion emulation produced `scroll-behavior: auto`, no body animation,
  and no transition.
- `/demo` requested only its own document, two local stylesheets, and local
  script. It stored only `demo:vram-fieldtest`; no telemetry, external font, or
  third-party script request occurred.
- Service-worker `update()` remained activated at `/sw.js`; a subsequent
  offline reload retained the demo title, heading, and banner with no errors.
- Browser response headers include CSP with `frame-ancestors 'none'`, HSTS,
  `nosniff`, and strict-origin referrer policy. HTML revalidates after 30s,
  hashed JS/CSS cache for one year immutable, `sw.js` is `no-cache`, and
  `release.json` is `no-store`.
- Initial app JS: 19,451 bytes raw / 6,772 gzip. CSS: 8,185 bytes raw / 2,800
  gzip. Hero WebP: 120,554 bytes.
- Clean mobile Lighthouse rerun: performance 98, accessibility 100, best
  practices 100, SEO 100, LCP 1,395 ms, CLS 0, TBT 167 ms, total transfer
  139,212 bytes. An earlier attempt crashed its Chromium tab and was discarded.

## Server endpoint, persistence, and identity

- Fresh live allowance probe: requests 1–8 from one network address returned
  200/invalid; request 9 returned 429 with `Retry-After: 599`. All responses
  were `no-store`. Observed allowance: **eight checks per address per rolling
  ten minutes**.
- A concurrent local handler probe produced eight 200s, one 429, and exactly
  eight upstream calls.
- Demo storage is namespaced under `demo:vram-fieldtest`; license state uses
  `sb_license:vram-fieldtest`. Automated isolation/reset tests passed.
- `/release.json` supplies the deployed build identity and is `no-store`.
- There is no sign-in flow, so the Entra External ID requirement is not
  applicable.

## Required remediation

1. Make the physical workflow duration valid (or raise the CLI's validated
   upper bound with matching tests), and execute the exact packaged commands in
   a workflow-level test.
2. Register physical Windows and Linux runners, publish a new exact-version tag,
   and attach validator-approved >=90% physical reports and checksums.
3. Register/enable the Sociobot product so the live checkout redirects to a
   working hosted purchase flow; add a reachability test.
4. Add safe thermal/clock providers for the advertised Metal and non-NVIDIA
   DirectX cases, or narrow platform support honestly.
5. Register and test the PowerShell checksum and Report Kit no-upload promises.
