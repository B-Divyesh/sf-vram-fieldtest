# Repair 6 handoff

## Result

Release v0.1.6 repairs the reproducible product and QA defects from
`.factory/verification-6.md`. The release tag points to
`2a23a4b55a48fcffcf79e0209a9c566e13097a4f`. The static product is deployed at
<https://vram-fieldtest.sociobot.in> and its live `release.json` identifies that
tag and commit.

One acceptance item still requires an external physical GPU lab: this worker
has no GPU device and the repository has no self-hosted GPU runners. Details
are under **Known gap**. No physical result was fabricated or relabelled.

## Repairs

### Thermal safety and multi-GPU binding

- A normal hardware run now refuses to start unless it has a temperature
  reading for the selected adapter. The error explains that the 85°C stop
  cannot be enforced.
- NVIDIA telemetry is selected by adapter device identity and name. Linux DRM
  telemetry is selected by vendor/device identity. Multiple identical matches
  are treated as ambiguous and rejected instead of monitoring adapter 0.
- Temperature is checked while reserving each test batch, before and after
  pattern batches, and after the final pattern. A lost reading stops the run as
  incomplete.
- `--allow-no-thermal-stop` is a separate, plainly labelled unsafe override.
  The CLI warns on stderr, records `thermal_limit_c: null`, and states that no
  automatic thermal stop was active. The hidden software-renderer release
  smoke path also records no thermal limit instead of claiming 85°C.
- Report persistence and outcome mapping now share one function. Incomplete
  reports exit 1 after JSON/HTML are saved; a detected mismatch maps to exit 2.

Regression coverage:

- `tests::hardware_run_requires_temperature_and_stops_if_it_disappears`
- `tests::selected_adapter_telemetry_never_falls_back_to_the_first_gpu`
- `tests::drm_telemetry_reads_only_the_selected_adapter`
- `tests::stop_reports_are_saved_and_mismatches_map_to_exit_two`
- claims `selected-thermal-stop`, `bounded-stop-report`, and `mismatch-exit`

### macOS memory enumeration

- macOS now enumerates Metal devices and uses
  `recommendedMaxWorkingSetSize` as the available memory total. The selected
  Metal adapter can therefore calculate the default target without `--mib`.
- Both macOS release jobs run the built `inspect --json` binary and require
  every listed adapter to report a nonzero Metal memory value.

The Intel and Apple-silicon jobs passed in rehearsal run `33278137203` and tag
run `33279533022`.

### Claims and high-memory wording

- The synthetic completed-96-GiB claim was removed. The product now says only
  what the sandbox proves: the default target is at least 90% and its allocation
  plan covers that target with unique contiguous allocations.
- Release protocol copy now calls the published 4 MiB Windows/Linux runs
  software-renderer smoke tests. `PROVENANCE.json` records their software
  adapters, null memory totals, null thermal limits, and actual 4 MiB results.
- `.factory/claims.json` now has 26 entries and exactly one matching test tag
  for each. New entries cover selected-adapter thermal behavior, stopped-report
  persistence, mismatch exit 2, platform memory sources, and the non-invasive
  voltage promise.
- The untestable statement that refunds are automatically revoked was removed.
  Terms now state only that the merchant of record handles refunds.
- `.factory/copy-audit.md` records the revised landing copy and has no sentence
  over 22 words or banned term.

### Keyboard and touch accessibility

- Demo `Reset demo` is now at least 44 px high.
- Footer and other action links have a 44×44 px minimum target; Terms no longer
  measures 41.2 px wide.
- `<summary>` uses the designed 4 px orange focus ring. Its contrast exceeds
  3:1 on both paper surfaces.
- Browser regressions enumerate visible controls at 390×844, measure the exact
  targets and focus rings, and open/close both disclosures with Enter and Space.

## Clean verification

Fresh clone at pushed commit `2a23a4b55a48fcffcf79e0209a9c566e13097a4f`:

- `npm ci`: 5 packages, 0 vulnerabilities.
- `npm test`: 26 Node/integration tests, 12 Rust tests, 28 Playwright tests.
- `npm run lint`: JavaScript and shell syntax, `cargo fmt --check`, and Clippy
  with warnings denied passed.
- `npm run build`: produced `dist/site` and the release CLI.
- `cargo test --locked --all-targets`: 12 passed.
- `cargo package --locked --allow-dirty`: 69 files; package verification passed.
- A fresh `cargo install --locked --path target/package/vram-fieldtest-0.1.6`
  consumer reported 0.1.6, ran the demo, and produced the 96 GiB plan:
  88,474 MiB, six windows, 90.0004% target coverage.
- Windows cross-check: `cargo check --locked --target
  x86_64-pc-windows-msvc` passed.
- Local initial payload: JavaScript 19,261 bytes, CSS 7,827 bytes, mobile CSS
  358 bytes, hero image 120,554 bytes.
- Local Lighthouse mobile: 99 performance, 100 accessibility, 100 best
  practices, 100 SEO; LCP 2.0 s, TBT 40 ms, CLS 0.

Remote automation:

- Clean-build run `33278132530`: success.
- Non-publishing four-platform rehearsal `33278137203`: success.
- Tagged release run `33279533022`: success, including Linux/Windows protocol,
  Intel/Apple-silicon macOS inventory checks, all packages, publication, and
  downloaded-archive provenance validation.

## Release and package evidence

- GitHub release: <https://github.com/B-Divyesh/sf-vram-fieldtest/releases/tag/v0.1.6>
- Assets include Linux tar/DEB/RPM, Windows ZIP, Intel and Apple-silicon macOS
  tar/PKG, `SHA256SUMS`, `latest.json`, `PROVENANCE.json`, and both smoke records.
- Downloaded Linux SHA-256 passed; its binary reported 0.1.6, ran the demo, and
  produced the expected 96 GiB plan.
- Live `install.sh` verified SHA-256, installed to a fresh directory, reported
  0.1.6, and ran the demo.
- Scoop and winget use Windows ZIP SHA-256
  `280e68772f874f7bcca61923ec930e1315baa86dc6fd19dec6068c2941458cc2`.
- Homebrew uses ARM SHA-256
  `7620786c85aad83fb60d653ee69fb92fdb8d5b3c1c2f3317dba65db94d4d39c1`
  and Intel SHA-256
  `b52f74560714c3e2de2da35953465c6f7812c37b1705e5c3e1d8b7241ab1786c`.
- The current formula matches
  `B-Divyesh/homebrew-vram-fieldtest@b14ba13` byte-for-byte.

## Production verification

- Deployment used the existing `sf-vram-fieldtest` Azure Static Web App. DNS
  and infrastructure were not changed.
- Landing, Demo, Report Kit, Privacy, Terms, and the real 404 passed with zero
  console/page errors and zero serious/critical Axe findings.
- Desktop keyboard route focus, 390×844 layout, 44×44 targets, disclosure focus
  contrast, 200% text, reduced motion, and offline demo reload passed.
- Landing, all physical routes, 404, installers, worker, and `release.json`
  matched `dist/site` byte-for-byte.
- Live download detection selected the real v0.1.6 Linux archive.
- `verify-url.sh`: 853 ms load; title, `lang=en`, one h1, main, alt text, and
  button labels passed with no console errors.
- Live Lighthouse mobile: 100 performance, 100 accessibility, 100 best
  practices, 100 SEO; FCP 0.8 s, LCP 1.5 s, TBT 30 ms, CLS 0.
- Direct demo requests remained same-origin. The service worker offline/update
  check passed with cache `vram-fieldtest-shell-v0.1.6`.
- Live security headers include CSP, HSTS, `nosniff`, and strict-origin
  referrer policy. The worker is `no-cache`; hashed assets are one-year
  immutable.
- Response policy: missing license returned 400 and `Cache-Control: no-store`;
  a unique invalid license returned 200 `{valid:false, reason:"invalid"}` and
  `no-store`. Local allowance coverage proves eight requests per network
  address, then 429 with `Retry-After`.

## Known gap — physical high-VRAM matrix

The researched acceptance measure still needs completed physical Windows and
Linux runs covering at least 90% of detected VRAM. This worker exposes no GPU,
and the GitHub repository has zero self-hosted runners. GitHub-hosted Windows
and Linux runners expose only Basic Render Driver and llvmpipe. Provisioning GPU
infrastructure or billing from this repository is explicitly prohibited.

The release therefore makes no completed high-VRAM claim. Its 90% statement is
only a target-planning claim with exact tests, and its software smoke evidence
is labelled accurately. To close the lab item, run the tagged v0.1.6 binary on
a physical Windows GPU and a physical Linux GPU with reported memory, keep the
default target, and publish both completed `report.json` files with checksums.

## Reproduce

```sh
npm ci
npm test
npm run lint
npm run build
cargo test --locked --all-targets
cargo package --locked --allow-dirty
npm run verify:live -- https://vram-fieldtest.sociobot.in
```
