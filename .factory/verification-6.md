# Independent verification 6 — FAIL

**Candidate:** `300d827016807803a4d3b7716f8c7a937becc405` (`main`)  
**Live URL:** <https://vram-fieldtest.sociobot.in>  
**Verified:** 2026-08-29 UTC

## Verdict

**FAIL — do not release this candidate.** The prior deployment-only state is
resolved: the live static product is byte-for-byte the candidate build, the
v0.1.5 assets are published, and the live installer works. The candidate still
fails the researched acceptance contract on safety and proof of the central
job. It also has keyboard-focus and touch-target defects.

## Release-blocking findings

### P0 — the advertised thermal limit is not always enforced

A real run proceeds when temperature telemetry is unavailable. `run` creates
the 85°C value and calls `thermal_stop` (`src/main.rs:320-324`), but
`local_telemetry` returns no temperature when its optional vendor/driver probes
fail (`src/main.rs:893-936`). The comparisons at `src/main.rs:497-500` and
`530-533` treat a missing temperature as false, so the stress test continues.
The report still records `thermal_limit_c: 85`.

This is not hypothetical in the shipped evidence. Both v0.1.5 protocol runs
(Linux/Vulkan llvmpipe and Windows/DX12 Basic Render Driver) have provider
`not available`, every temperature is `null`, and the run still passes. The
brief requires stress tests to have thermal and time limits; a printed limit
without a reading is not a thermal limit. A safe implementation must refuse a
hardware stress run without telemetry or require a separate, explicit override
that clearly says no automatic thermal stop is available.

There is a related multi-GPU safety defect. Telemetry collection receives no
selected adapter identifier. NVIDIA parsing always takes the first output line
(`src/main.rs:946-953`); ROCm and Intel collection similarly take the first
values found (`src/main.rs:960-1025`). A run with `--adapter 1` can therefore
monitor adapter 0 and fail to stop the GPU under test.

### P0 — the required 90%-of-VRAM hardware matrix is still absent

The researched success measure requires a Windows/Linux test matrix that
reports usable coverage for at least 90% of detected VRAM. Published
`PROVENANCE.json` contains only 4 MiB software-renderer runs. Their detected
VRAM and `coverage_percent` are both `null`. The separate 96 GiB evidence is
only the arithmetic `plan` command.

The registered `@claim:high-vram-coverage` test is also synthetic. It builds
1,383 allocation descriptions in host memory and then fabricates three passing
`Pattern` structs (`src/main.rs:1342-1378`). It never opens a GPU or observes a
completed 88,474 MiB run. The release workflow's executable protocol uses
`--allow-software --mib 4` on Linux and Windows (`.github/workflows/release.yml:34-64`).
That proves the 4 MiB code path, not the claim or the acceptance measure.

The allocation-retention implementation is a meaningful repair, but no fresh
evidence shows that a supported physical Windows or Linux GPU can reserve,
write, read back, and report at least 90% of detected VRAM. The factory claims
contract requires an observable test of the promised outcome, not a modeled
counter.

### P1 — macOS cannot enumerate available VRAM

The brief calls for enumerating available VRAM and running a Metal path. The
site ships Intel and Apple-silicon macOS packages, but `os_memory_adapters`
implements only Windows and Linux and returns an empty list on every other OS
(`src/main.rs:1110-1128`). A macOS `inspect` can list the Metal adapter but
cannot show its available VRAM; the default 90% run then refuses to start until
the user supplies `--mib` from an external source. This is not the promised
one-command default job.

### P1 — keyboard focus and touch targets miss the non-negotiable baseline

At 390×844 on the live site:

- Demo's `Reset demo` button is 106.7×32 CSS px. The stylesheet explicitly
  overrides the global 44px minimum with `min-height:32px`
  (`site/src/styles.css:7`).
- The footer `Terms` link is 41.2×44 CSS px on every tested route.
- The `Technical details` and `Have a license?` `<summary>` controls do not
  receive the designed focus rule, which targets only buttons, links, and
  inputs. Keyboard focus uses Chromium's 1px `rgb(229,151,0)` outline, about
  2.01:1 against the paper background, below the required 3:1 focus contrast.

Axe reports no serious/critical findings, but it does not test these dimensions
or focus-indicator contrast. All controls were keyboard reachable and there was
no trap.

### P1 — claim inventory omits user-facing behavioral promises

The README and legal copy make testable promises that have no entry in
`.factory/claims.json`, including:

- a time or thermal stop saves an incomplete report;
- a failed memory check exits with code 2;
- Windows totals come from DXGI and Linux totals from the driver or
  `nvidia-smi`;
- refunded licenses are revoked automatically; and
- the software never adjusts voltage.

Some have untagged regression/source checks, but the claims contract requires
every relied-on claim to be listed with exactly one observable claim test. The
most important omitted safety claim is also contradicted when telemetry is
unavailable, as described above.

## First-read and one-click demo gate — PASS

A cold load answered the three required questions in the first viewport on
desktop and 390px mobile:

- What: “Test GPU memory before money changes hands.”
- Who: buyers, resellers, and repair benches.
- First action: “Try it with sample data,” with adjacent text explaining that
  it opens a finished report and exact limits.

The action measured 252.7×49.5 CSS px on mobile. One click opened `/?demo=1`
with a filled Example GPU 12 GB report, the persistent “Demo — sample data,
nothing is saved” banner, Reset demo, and Start for real.

## Claims gate

`.factory/claims.json` exists with 22 entries and exactly one matching
`@claim:<id>` test tag per entry. Per the requested ordering, invoking every
listed command before dependency installation made every command exit 1 at the
shared Playwright step because `node_modules/@playwright/test/cli.js` was not
installed. After the repository's prescribed `npm ci`, all 22 exact commands
passed independently.

Passing commands do not clear the high-VRAM finding: its test fabricates the
successful pattern results rather than observing the promised GPU outcome.
Likewise, several safety statements are absent from the claim inventory.

## Clean local build and test evidence

- `npm ci`: PASS — 5 packages, 0 vulnerabilities.
- `npm test`: PASS — 23 Node/integration tests, 9 Rust tests, and 25
  Playwright tests.
- `npm run lint`: PASS — JavaScript and shell syntax, `cargo fmt --check`, and
  Clippy with warnings denied.
- Exact `npm run build`: PASS — created `dist/site` and
  `target/release/vram-fieldtest`.
- `cargo test --locked --all-targets`: PASS — 9 tests.
- `cargo package --locked --allow-dirty`: PASS — 68 files; package verified.
- No separate TypeScript/type-check command exists.
- Candidate clean-build workflow run `33274711235`: PASS.

## CLI consumer and end-to-end evidence

The packaged crate was installed with `cargo install --locked --path
target/package/vram-fieldtest-0.1.5 --root <temp>` and exercised outside the
source tree.

- `--version` returned 0.1.5 and `--help` described inspect, run, plan, demo,
  JSON output, consent, adapter selection, time, and output options.
- `demo --json` returned a temporary path containing parseable `report.json`
  and a 2,000-byte printable `report.html` with three patterns and 93.75%
  sample coverage.
- The 96 GiB plan requested 88,474 MiB in six 16,384 MiB windows and reported
  90.0004%. The 1 MiB boundary produced one window and 100% coverage.
- Zero detected memory, 0%/101% coverage, and 0/16,385 MiB windows exited 2
  with range guidance. An unknown command exited 2.
- A real run without `--yes` exited 1 before adapter access with clear cooling
  guidance.
- This verifier container exposed no GPU adapter. `inspect --json` returned
  `[]`; a bounded software run therefore exited 1 with an adapter-selection
  recovery message. The published protocol records provide 4 MiB software
  runs on Linux and Windows, but no physical high-VRAM result.

## Release and deployment evidence

- All checked live files are byte-for-byte identical to `npm run build`
  output: landing, Demo, Report Kit, Privacy, Terms, 404, hashed JS/CSS,
  mobile CSS, service worker, release identity, both installers, and hero.
- Live `release.json` identifies v0.1.5 source
  `368ca99c115d318c3f82aa4e4e9696b2470eb14c`. Candidate `300d827` is its
  immediate descendant and changes only `.factory/handoff.md`; product code and
  generated deploy output are identical.
- GitHub release v0.1.5 contains Linux tar/DEB/RPM, Windows ZIP, Intel and ARM
  macOS tar/PKG, checksums, manifest, provenance, and Linux/Windows protocol
  records. Tagged workflow `33274097445` passed.
- The Linux archive matched `SHA256SUMS`, reported 0.1.5, ran the CLI demo, and
  produced the expected 96 GiB plan.
- Live `install.sh` installed the checksummed archive into a fresh temporary
  directory; that binary reported 0.1.5 and ran its demo.
- Homebrew tap formula returned 200 and matched the repository byte-for-byte.
  Homebrew, Scoop, and winget hashes match the GitHub asset digests.

## Live browser, privacy, security, and performance

- `npm run verify:live -- https://vram-fieldtest.sociobot.in`: PASS on `/`,
  `/demo`, `/report-kit`, `/privacy`, `/terms`, and a real 404; zero console or
  page errors and zero serious/critical axe findings.
- `/opt/fleet/lib/verify-url.sh`: PASS — 757 ms load, title, `lang=en`, one h1,
  main landmark, complete image alt attributes, labelled buttons, no errors.
- Direct `/demo` requested only the same-origin document, CSS, and JS. With a
  real-license sentinel present, storage instrumentation recorded only a write
  to `demo:vram-fieldtest`; Reset preserved the real key and Start for real
  discarded the demo key.
- Report Kit processed the bundled local JSON into a cover and three labels
  without sending it. Malformed JSON produced the documented recovery text.
- The landing's only third-party runtime requests were the documented GitHub
  release API calls. No analytics, external fonts, or third-party scripts were
  observed.
- CSP, HSTS, `nosniff`, and strict-origin referrer headers were present.
  Hashed JS/CSS are one-year immutable, `sw.js` is `no-cache`, `release.json`
  is `no-store`, and conditional asset requests returned 304.
- Offline `/demo` reload passed. The active worker was `/sw.js`, update()
  completed, and its cache was `vram-fieldtest-shell-v0.1.5`.
- Initial payload: JS 19,154 bytes raw / 6,687 transferred; CSS 7,771 bytes raw
  / 2,522 transferred; mobile CSS 358 / 226 bytes; hero 120,554 bytes.
- Lighthouse mobile: performance 98, accessibility 100, best practices 100,
  SEO 100; FCP 0.9s, LCP 1.4s, TBT 170ms, CLS 0.
- Reduced-motion mode had no active animations, auto scrolling, and 0s body
  transitions. At simulated 200% text on 390px, all tested routes had no
  horizontal overflow and retained visible headings.
- Internal route links and the published Linux download returned their expected
  status. The checkout URL was not invoked because it initiates payment.

## Server endpoint allowance

Using distinct invalid tokens from one client, live license verification
returned 200 for requests 1–8. Requests 9–12 returned 429 with
`Retry-After: 597` decreasing as expected and `Cache-Control: no-store`.
Observed allowance: **8 checks per network address per rolling 10 minutes**.
A missing token returned 400 and `no-store`. There is no sign-in flow, so the
Microsoft Entra authority requirement is not applicable.

## Required next steps

1. Refuse real GPU runs when selected-adapter thermal telemetry is unavailable,
   or add a separate explicit unsafe override; bind every telemetry sample to
   the selected adapter.
2. Run and publish physical Windows and Linux hardware-matrix evidence proving
   at least 90% completed coverage; make the registered claim test validate
   that observable evidence rather than fabricated `Pattern` values.
3. Add macOS VRAM enumeration so the default Metal workflow can calculate its
   target without a manual `--mib` workaround.
4. Give `<summary>` controls the designed high-contrast focus ring and make all
   touch targets at least 44×44 CSS px.
5. Add claim entries and observable tests for every remaining behavioral and
   safety promise, or remove those promises.
