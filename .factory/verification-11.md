# Independent product verification 11 — FAIL

**Candidate:** `0d020bbf1a9da96aec0955430a63960dfad48b76` (`main`, tag `v0.1.9`)

**Live URL:** <https://vram-fieldtest.sociobot.in>

**Verified:** 2026-08-30 UTC

**Work order:** `vram-fieldtest-verify-11`

## Verdict

**FAIL — do not accept this candidate as complete.**

The candidate fixed the earlier mixed-version deployment: the site, tag,
release provenance, and downloadable CLI now all identify the requested
commit. The demo, claims, local gates, package install, accessibility,
privacy, performance, caching, and rate limiting are healthy.

The release still does not meet the researched product's decisive success
measure. There is no completed physical-GPU report showing at least 90% of
detected VRAM on Windows and Linux. The release explicitly labels itself as a
package release, and the README explicitly says it provides no physical
Windows or Linux GPU coverage.

## Release-blocking findings

### P0 — required physical Windows/Linux 90% coverage matrix is absent

The researched acceptance contract requires a reproducible test matrix that
reports usable coverage for at least 90% of detected VRAM on both Windows and
Linux. Candidate `v0.1.9` provides no such evidence:

- The 19 published assets contain platform packages, checksums,
  `latest.json`, and `PROVENANCE.json`; there are no physical Windows or Linux
  GPU reports or evidence bundles.
- `PROVENANCE.json` says `evidence_kind: "package-release"` and says coverage
  evidence comes from user runs.
- [README.md](/work/repo/README.md:124) says hosted software-renderer jobs are
  package checks only and, at line 128, explicitly says the product “does not
  provide physical Windows or Linux GPU coverage.”
- [release.yml](/work/repo/.github/workflows/release.yml:34) uses software
  renderers, 4 MiB, and `--allow-software`; its evidence is labelled
  “software-renderer smoke only; not a physical VRAM run.”
- This verifier has no GPU (`vram-fieldtest inspect --json` returned `[]`), so
  a real hardware result could not be created independently.

Planning math is not a substitute for the missing result. The installed
candidate correctly planned 11,060 MiB for a 12,288 MiB card and 88,474 MiB
for a 98,304 MiB card, both just over 90%, but neither command allocated GPU
memory or completed the three patterns.

Required remediation: run the tagged binary on physical Windows and Linux
GPUs, publish the reports and reproducibility metadata, and show non-null
detected VRAM, at least 90% completed coverage, all three patterns, retained
allocations, and selected-adapter telemetry.

### P1 — safe cross-vendor telemetry remains incomplete

The brief calls for safe cross-vendor testing with thermals and clocks. The
only telemetry paths are NVIDIA through `nvidia-smi` and Linux DRM sysfs
([main.rs](/work/repo/src/main.rs:1052)). There is no non-NVIDIA Windows or
macOS temperature provider. Linux DRM also leaves memory clock unset.

The safe default correctly refuses to run without selected-adapter
temperature data, but this means common AMD/Intel Windows and macOS hosts
cannot complete the advertised safe default flow. They must use the explicitly
unsafe `--allow-no-thermal-stop` path, which cannot satisfy the thermal-limit
part of the brief.

### P1 — installer signing in the researched brief is not delivered

The researched smallest useful product says “Signed CLI installers.” The
Windows and macOS packages are explicitly unsigned
([README.md](/work/repo/README.md:35)); the annotated `v0.1.9` tag is also
unsigned. SHA-256 verification works and the limitation is honestly
disclosed, but checksums do not provide publisher identity. This is an
acceptance-contract gap even though it follows the attached installer's
documented unsigned fallback.

### P1 — the specified one-time purchase path is unavailable

The researched monetization is a one-time purchase. The live landing and
Report Kit routes say checkout is unavailable, and the application has
`reportKitCheckout = null` ([app.js](/work/repo/site/src/app.js:7)). Restoring
an already issued token is implemented, but a new customer cannot buy the
Report Kit end to end. The core CLI and reports remain free and usable.

## Mandatory first-read and demo gate — PASS

A cold desktop Chromium context opened the live root.

- **What it does:** “Test GPU memory before money changes hands.”
- **For whom:** buyers, resellers, and repair benches needing a clear memory
  test record.
- **What to click first:** **Try it with sample data**, followed by “See a
  finished report and the exact test limits.”

The one-click action was fully inside the first 390×844 viewport at
252.7×49.5 CSS pixels. Keyboard Enter opened `/?demo=1`. The resulting page
showed a filled Example GPU 12 GB report, the persistent “Demo — sample data,
nothing is saved.” banner, Reset demo, and Start for real. Reset recreated only
`demo:vram-fieldtest`; Start for real removed that key.

## Claims gate — PASS after the documented install

`.factory/claims.json` exists with 28 entries. Source scanning found exactly
one matching `@claim:<id>` test for every entry and no undeclared claim tags.

On the untouched clone, the first exact command could not load
`node_modules/@playwright/test` because dependencies had not yet been
installed. The README's clean-run sequence starts with `npm ci`. After that
required clean install, I ran every exact manifest command independently; all
28 passed:

`demo-report`, `demo-sample`, `sample-equality`, `cli-local`,
`report-output-path`, `non-invasive`, `unsigned-builds`, `no-account`,
`safety-consent`, `host-vram-inspection`, `completed-run-coverage`,
`selected-thermal-stop`, `bounded-stop-report`, `mismatch-exit`,
`installer-checksum`, `release-download`, `site-offline`, `demo-privacy`,
`mobile-first-action`, `route-metadata`, `report-kit-output`,
`report-kit-operator-gate`, `license-storage`, `license-rate-limit`,
`unlock-allowance`, `release-package-provenance`, `host-evidence-scope`, and
`host-evidence-bundle`.

No claim assertion failed. The passing host-evidence tests validate fixture
shape and user-host scope; they do not replace the absent physical matrix.

## Clean checkout, build, and package — PASS

- `npm ci`: passed; 5 packages, 0 vulnerabilities.
- `npm test`: passed; 31 Node/integration checks (30 passed, one
  Windows-only local fixture skipped), 13 Rust tests, and 29 Playwright tests.
- `npm run lint`: passed JavaScript/Python/shell syntax, Rust formatting, and
  `cargo clippy --locked -- -D warnings`.
- `npm run build`: passed and produced `dist/site` plus
  `target/release/vram-fieldtest`.
- `cargo test --locked --all-targets`: 13 passed.
- `cargo check --locked --all-targets`: passed.
- `cargo package --locked --allow-dirty`: passed; 80 files, 2.7 MiB.

## Clean consumer and CLI behavior — PASS within this GPU-free host

I installed `target/package/vram-fieldtest-0.1.9` into a new Cargo consumer
root. The installed binary reported `vram-fieldtest 0.1.9` and documented
`run`, `plan`, `demo`, and `inspect`.

- A proxy-blocked `demo --json` passed and wrote a 2,162-byte `report.json`
  plus a 2,044-byte print-ready `report.html` to a temporary directory.
- `inspect --json` returned `[]` on this host.
- 12 GiB/90% planned 11,060 MiB over 11 windows.
- 96 GiB/90% planned 88,474 MiB over six windows.
- Missing `--yes` exited 1 before GPU access and explained the consent step.
- Detected memory 0 and coverage 101 exited 2 with accepted ranges.
- Adapter 999999 exited 1 and instructed the user to run `inspect`.

The mismatch-exit, stopped-run report, disappearing-temperature, 85°C stop,
selected-adapter, and incomplete-coverage paths also passed their controlled
claim/unit fixtures. No physical GPU was available, so no real result is
claimed.

## Release and deployment identity — PASS

- Live `release.json`, local `dist/site/release.json`, annotated tag `v0.1.9`,
  `latest.json`, and `PROVENANCE.json` all identify
  `0d020bbf1a9da96aec0955430a63960dfad48b76`.
- All 20 public deployable files compared byte-for-byte equal between the
  fresh local build and live deployment. `staticwebapp.config.json` correctly
  remained server configuration rather than a public file.
- GitHub release workflow run `33295300286` and clean-build run `33295299854`
  completed successfully for this commit. The release produced Linux archive,
  deb, rpm, Windows zip, Intel/Apple-silicon macOS archives and pkg files,
  per-file checksums, `SHA256SUMS`, `latest.json`, and `PROVENANCE.json`.
- A freshly downloaded Linux archive, manifest, and provenance all passed
  `sha256sum -c`. Its binary reported 0.1.9 and ran the demo.
- The live one-line shell installer installed to a fresh temporary directory,
  printed its destination, produced a 0.1.9 binary, and its network-blocked
  demo passed.
- The repository test inspects both shell and PowerShell checksum guards;
  the PowerShell runtime fixture ran in Windows CI but was unavailable on this
  Linux verifier.

## Live web, privacy, accessibility, and resilience — PASS

- `npm run verify:live -- https://vram-fieldtest.sociobot.in` passed `/`,
  `/demo`, `/report-kit`, `/privacy`, `/terms`, and a true HTTP 404 route with
  zero console/page errors and zero serious/critical axe findings.
- `/opt/fleet/lib/verify-url.sh` passed: 976 ms load, title, `lang=en`, one
  h1, main landmark, all image alt attributes, labelled buttons, and no
  console errors.
- Independent axe checking found no serious/critical finding. Every visible
  link, button, input, and disclosure on all five public routes measured at
  least 44×44 CSS pixels at 390 px.
- Keyboard focus first reached the skip link. The skip link and primary demo
  action had a visible 4 px orange outline. Enter activated the demo action.
- The 390 px page had no horizontal overflow. Reduced-motion emulation had no
  running animations and used `scroll-behavior: auto`.
- The demo's request log was same-origin while demo mode was active. It made no
  analytics, telemetry, font-CDN, license, or report-upload request. The normal
  landing additionally contacted only the documented GitHub API for release
  metadata.
- Report Kit read the bundled JSON locally, rendered one cover and three
  labels, and caused no request after upload. Malformed JSON cleared output
  and showed a concrete recovery instruction.
- Service-worker registration/update remained activated. After going offline,
  `/demo` reloaded with HTTP 200, its route title, sample heading, and demo
  banner, with no console errors.
- All discovered internal links and the selected Linux release link returned
  HTTP 200.
- No sign-in flow exists, so the Microsoft Entra tenant check is not
  applicable. The product has no AI feature; the brief does not benefit from
  one.

## Headers, caching, budgets, and Lighthouse — PASS

The live HTML response includes CSP with `frame-ancestors 'none'`, HSTS,
`X-Content-Type-Options: nosniff`, and
`Referrer-Policy: strict-origin-when-cross-origin`. HTML and unhashed assets
use 30-second revalidation; fingerprinted JS/CSS use one-year immutable
caching; `/sw.js` uses `no-cache`. The unknown route returns the styled page
with HTTP 404.

- Initial application JS: 6,859 bytes gzip; all JS including worker: 7,252
  bytes gzip (budget 200 KB).
- All CSS: 2,571 bytes gzip (budget 50 KB).
- Fonts: 0 bytes; the site uses system stacks.
- Hero WebP: 120,554 bytes (budget 300 KB).
- Lighthouse mobile: performance 100, accessibility 100, best practices 100,
  SEO 100; FCP 1.18 s, LCP 1.47 s, TBT 40 ms, CLS 0.

## License endpoint — PASS

The documented allowance is **eight checks per network address per rolling ten
minutes**. From one live client, requests 1–8 returned HTTP 200 with the normal
invalid-license response. Request 9 returned HTTP 429,
`{"valid":false,"reason":"rate_limited"}`, `Retry-After: 599`, and
`Cache-Control: no-store`.

A local 20-request concurrent burst against the production handler admitted
exactly eight upstream calls and returned 429 with `Retry-After: 600` for the
other twelve. Rate state is deliberately ephemeral in the server process; no
user or hardware report data is persisted by the endpoint.

## Required next steps

1. Produce and publish completed ≥90% physical-VRAM evidence on Windows and
   Linux from the tagged binary, then independently verify the reports.
2. Add safe temperature/clock providers for the intended non-NVIDIA Windows
   and macOS hardware, or narrow the supported-platform promise.
3. Sign Windows and macOS installers when operator certificates are available.
4. Configure and verify the Sociobot one-time Report Kit product mapping before
   presenting monetization as shipped.
