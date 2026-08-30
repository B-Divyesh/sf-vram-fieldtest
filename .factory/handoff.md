# Repair 8 handoff — physical release gate repaired; lab execution still required

**Work order:** `vram-fieldtest-repair-8`

**Verifier report:** `.factory/verification-8.md` at `6a419f7028a4ccccb4e6fba5b6d07d1aa8c41c8f`

**Rejected candidate:** `a4bc98619800729dadb9c22f979ea8d6b7f920ee`

**Repair implementation:** `021105e9a4d6cf663d252892bc7668d82e19e2d7`

**Live URL:** <https://vram-fieldtest.sociobot.in>

## Honest result

The release-process root cause is repaired and deployed without changing the
accepted product behavior. Tagged publication now fails closed until packaged
Windows and Linux binaries each complete a physical GPU run covering at least
90% of detected VRAM.

This worker cannot produce the two physical reports. It has no GPU, and the
repository has zero self-hosted runners. No new version was tagged or released,
so the verifier's physical-execution P0 is **not claimed as closed**. The live
site remains paired with the valid v0.1.8 release while the lab step is pending.

## Finding reproduction

The published v0.1.8 artifacts were downloaded and inspected before repair.
Their evidence records reproduce the verifier's finding exactly:

- Windows: `Microsoft Basic Render Driver`, `device_type: software`, 4 MiB
  tested, and null detected VRAM, coverage, and temperature.
- Linux: `llvmpipe`, `device_type: software`, 4 MiB tested, and null detected
  VRAM, coverage, and temperature.
- Both records say `software-renderer smoke only; not a physical VRAM run`.
- This worker's `target/release/vram-fieldtest inspect --json` returned `[]`.
  A consented 1 MiB run exited 1 with the adapter-selection recovery message.
- GitHub's repository runner API returned `total_count: 0`.

## Repair

- `.github/workflows/release.yml` keeps hosted Linux/Windows checks as
  `protocol_smoke`, but those artifacts never enter release provenance.
- Tag publication now depends on `hardware_linux` and `hardware_windows` jobs
  on runners labelled `self-hosted`, the matching OS, `X64`, and
  `physical-gpu`.
- Each hardware job downloads and tests the already packaged release binary.
  It uses the local detected-memory value and the exact `--coverage 90`
  request. Fixed `--mib`, `--allow-software`, and
  `--allow-no-thermal-stop` flags are absent.
- `scripts/hardware-evidence.py` rejects software or virtual adapters, missing
  or untrusted OS VRAM sources, coverage below 90%, arithmetic mismatches,
  incomplete or mismatching patterns, non-retained allocations, absent or
  ambiguous selected-adapter temperatures, unsafe thermal configuration,
  wrong OS/version/commit, and changed JSON/HTML/binary hashes.
- A successful release publishes both hosts' JSON and HTML reports, individual
  evidence manifests, exact inspect/run commands, tested-binary hashes,
  `PROVENANCE.json`, `latest.json`, and a checksum covering every file.
- Post-publication verification downloads both archives and all hardware
  records, checks their release checksums, rehashes both tested binaries, and
  reruns the evidence validator.
- The new `physical-release-gate` claim and two regression tests cover the
  workflow dependency and validator acceptance/rejection paths. The rejection
  fixture matches the verifier's software-renderer/null-VRAM record.

## Verification evidence

All checks below passed on 2026-08-30 UTC.

- Clean install: `npm ci` installed 5 packages, found 0 vulnerabilities.
- Full suite: `npm test` passed 28 Node/integration tests, 13 Rust tests, and
  29 Playwright tests.
- Fresh remote clone at `021105e`: `npm ci && npm test && npm run lint && npm
  run build` passed with the same totals.
- Every one of the 26 commands registered in `.factory/claims.json` passed
  independently. Local logs: `/tmp/vram-claims.HUvwOb`.
- `npm run lint` passed JavaScript, Python syntax, shell syntax, Rust format,
  and Clippy with warnings denied.
- `actionlint` 1.7.12 passed both GitHub workflow files with the checked-in
  custom-runner label configuration.
- `npm run build` produced `dist/site` and
  `target/release/vram-fieldtest`.
- `cargo test --locked --all-targets` passed 13 tests.
- `cargo package --locked --allow-dirty` verified 73 files, 1.6 MiB before
  compression.
- A clean consumer install from
  `target/package/vram-fieldtest-0.1.8` reported version 0.1.8, showed all
  public commands, and completed `demo --json` with verdict `pass`.
- The real v0.1.8 Linux archive matched published `SHA256SUMS`, reported
  version 0.1.8, and completed its bundled demo.
- Initial app JavaScript is 19,451 bytes raw and 6,769 bytes gzip. All
  JavaScript/CSS/worker files total 10,114 bytes gzip. The hero WebP is
  120,554 bytes.
- Mobile Lighthouse 12.8.2: performance 97, accessibility 100, best practices
  100, SEO 100, LCP 2,072 ms, CLS 0, total transfer 158,829 bytes.
- `/opt/fleet/lib/verify-url.sh` found title, `lang=en`, one h1/main, no missing
  alt text, no unlabeled buttons, and no console errors at desktop and 390 px.
- Playwright additionally passed skip-link and route focus, Enter/Space
  disclosures, 44 px targets, 200% text, reduced motion, same-origin demo
  privacy, service-worker update, offline reload, and zero serious/critical
  Axe findings on all six tested routes.
- GitHub clean-build run `33286483243` passed:
  <https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33286483243>.

## Deployment and live checks

`/opt/fleet/lib/deploy-static.sh vram-fieldtest dist/site` reused
`sf-vram-fieldtest` in `centralus` and completed deployment
`7a3b7acb-1413-4a51-b5e7-2481c69f59eb`.

`npm run verify:live -- https://vram-fieldtest.sociobot.in` passed:

- Landing, Demo, Report Kit, Privacy, and Terms return 200; an unknown route
  returns the styled 404.
- Every route has one h1/main, no console errors, and zero serious/critical Axe
  findings.
- At 390 px, `clientWidth` and `scrollWidth` are both 390 and the primary
  action is 49.5 px high.
- Same-origin privacy capture, offline reload, keyboard checks, and reduced
  motion pass.
- All 11 checked deployable files are byte-identical to `dist/site`.
- HTML uses 30-second revalidation; hashed assets use one-year immutable
  caching; `sw.js` uses `no-cache`.
- CSP, HSTS, `nosniff`, and strict-origin referrer policy are present.
- The live license endpoint returned 400/no-store for a missing token, eight
  200 responses for invalid tokens, then 429/no-store with `Retry-After: 592`.
- Live identity remains v0.1.8 at
  `f5bec7de1409eb24feb8773f8c23c9949819da54`, matching the downloadable
  release. This is deliberate: the workflow/docs repair does not alter the
  deployed application or released binary.

## Required operator action

1. Register one physical x64 Linux runner with labels
   `self-hosted,Linux,X64,physical-gpu` and one physical x64 Windows runner
   with labels `self-hosted,Windows,X64,physical-gpu`.
2. Confirm each selected GPU exposes detected VRAM and temperature telemetry.
3. Prepare the next synchronized version and package manifests, then push its
   exact `v*` tag. Do not retarget or replace v0.1.8.
4. Let both hardware jobs finish. Publication will remain blocked if either
   host does not complete all three patterns at 90% or more.
5. Download the published evidence files, rerun the documented validator, and
   request independent verification.

No DNS, billing, or new infrastructure was created. The missing physical lab
runners are the only remaining release blocker.
