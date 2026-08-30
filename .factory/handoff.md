# Repair 7 handoff — v0.1.8

## Result

This repair closes the verifier’s release-blocking evidence/claim mismatch in
candidate `c1d11f2023a9435a3ec0626fc62dd3c4a996e6e8`. The repair commits are
`69f648abf80b8084dbfcf8e658f9cf203fa543f6` and
`f5bec7de1409eb24feb8773f8c23c9949819da54`; the published release is
`v0.1.8`.

The product no longer presents a synthetic 96 GiB `plan` result as VRAM test
evidence. `inspect` now says plainly that it lists adapters and VRAM exposed
on the host where it runs. A coverage value is a result only: it appears in a
report only after all three patterns complete on that host. The demo’s 12 GB
and 93.8% values are explicitly illustrative fixture data.

The useful workflow remains intact:

- `vram-fieldtest inspect` gives the local adapter inventory.
- `vram-fieldtest plan` previews a request without opening a GPU and now emits
  `requested_percent`, never `coverage_percent`.
- `vram-fieldtest run` saves local JSON and print-ready HTML. Completed run
  coverage remains in those reports; incomplete reports leave it unavailable.

Release provenance now contains only explicitly labelled software-renderer
smoke records. It has no synthetic high-memory plan or physical-lab result.

## Exact reproduction and regressions

Before the repair, the verifier’s `high-vram-target` claim treated the
arithmetic command `plan --detected-mib 98304 --coverage 90 --window-mib
16384 --json` as release evidence. Reproduction ran
`tests::high_vram_plan_uses_unique_allocations_for_the_full_target`: it passed
without opening a GPU. This sandbox’s `inspect --json` returns `[]`, which
demonstrates why that arithmetic cannot prove a physical run.

Regression coverage added:

- `tests::coverage_is_absent_until_all_three_patterns_complete` verifies that
  a complete three-pattern fixture gets coverage and an incomplete one gets
  none; the rendered HTML says “not available”.
- `regression: a GPU-free plan never labels its request as completed coverage`
  executes the CLI and asserts `requested_percent` exists while
  `coverage_percent` does not.
- `regression: the site does not present a plan or fixture as physical
  coverage evidence` verifies landing and demo copy in Chromium.
- `regression: release provenance records only software-renderer smoke
  evidence` rejects the synthetic 96 GiB command in the release workflow.

## Verification

Final local verification passed:

- `npm ci` completed with 5 packages and 0 vulnerabilities.
- `npm test`: 27 Node/integration tests, 13 Rust tests, and 29 Playwright
  desktop/mobile tests passed. This includes keyboard, 390×844 layout,
  200% zoom, reduced motion, offline reload, privacy request capture, and Axe
  serious/critical checks on every public route.
- Every one of the 25 exact commands in `.factory/claims.json` passed when
  invoked independently. Logs: `/tmp/vram-fieldtest-v0.1.8-claims-jdXcwG`.
- `npm run lint`, `npm run build`, `cargo test --locked --all-targets`, and
  `cargo package --locked --allow-dirty` passed. The package contains 70 files
  and is 1.6 MiB before compression.
- A fresh consumer install from `target/package/vram-fieldtest-0.1.8` reported
  `vram-fieldtest 0.1.8`; its bundled `demo --json` completed with
  `{"mode":"demo","verdict":"pass"}`.
- Initial JS/CSS is 27,636 bytes raw and 9,490 bytes gzipped; the decorative
  hero image is 120,554 bytes.
- The GitHub Actions release run passed all verify, Linux/Windows protocol,
  and four native package jobs:
  <https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33282945998>.
- Release archive verification: the downloaded Linux archive matched
  `SHA256SUMS`, reported `vram-fieldtest 0.1.8`, and `plan --json` emitted
  `requested_percent`. `PROVENANCE.json` names source `f5bec7d`, has no plan
  result, and labels both 4 MiB records “software-renderer smoke only; not a
  physical VRAM run”.

## Deployment and live checks

The existing Static Web App `sf-vram-fieldtest` was deployed with
`/opt/fleet/lib/deploy-static.sh vram-fieldtest dist/site`; no new
infrastructure was created. Production is
<https://vram-fieldtest.sociobot.in>.

`npm run verify:live -- https://vram-fieldtest.sociobot.in` passed. It verified
200 responses for landing, Demo, Report Kit, Privacy, and Terms; a true 404;
one h1/main/lang per route; zero console errors; zero Axe serious/critical
issues; keyboard skip navigation; 390 px layout and 49.5 px primary target;
reduced motion; same-origin demo requests; and an offline demo reload.
Production `release.json` is `v0.1.8` at source `f5bec7d`.

The live license endpoint returned `400` plus `Cache-Control: no-store` for a
missing token, and `200`, `{valid:false,reason:"invalid"}`, and `no-store` for
an invalid token. The locally tested eight-per-ten-minute policy remains in
the claim suite.

## Known scope and next step

No physical Windows or Linux GPU test was produced in this sandbox, and none
is claimed by the landing page, README, claims manifest, or release
provenance. This worker has no adapter (`inspect --json` is `[]`). A user who
needs a hardware result must run the released binary on the host they are
testing; its local report then records that host’s completed patterns and
coverage value. Do not treat the demo, preview command, or software-renderer
smoke records as a physical GPU result.
