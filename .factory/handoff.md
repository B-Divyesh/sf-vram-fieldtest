# Repair 12 handoff

**Outcome:** the v0.1.11 repair is released and deployed.

- Implementation and release SHA: `2691b14210e2c5b081d8193e34ca99fe559a9c21`
- Release: `v0.1.11`
- Live URL: <https://vram-fieldtest.sociobot.in>
- Documentation SHA: the final report-only `main` commit that contains this file; it is intentionally later than the implementation SHA and is recorded in the completion response.
- Deployment ID: `5c0bcf40-428a-4083-b6ab-6dd096f4f00f`

## What changed

Repair 12 closes the locally repairable findings in `.factory/review-2.md`:

- Release identity now separates the tagged CLI source from later report-only site commits. Clean tests and live verification no longer demand a needless product rebuild for documentation-only changes.
- Mac downloads select Intel or Apple silicon when the browser reports an architecture. Browsers that do not report it show both clearly labelled choices.
- Homebrew, Scoop, and winget each have a declared claim command. The tests resolve their public v0.1.11 assets, verify SHA-256, extract them, and check the executable format.
- The Homebrew instructions use this product repository as the tap. They no longer reference the stale separate tap.
- The generated hero image is published at a content-hashed URL under the one-year immutable cache route.
- Public copy states the safe real-run boundary. Automatic temperature stops currently use NVIDIA SMI or Linux DRM hwmon. Other Windows and macOS cards can inspect, plan, and run the sample, but their default memory run remains blocked.
- The $19 one-time Report Kit offer remains intact. Checkout is withheld while its Sociobot mapping is absent; the free CLI and JSON/HTML reports are not gated.
- Version, service-worker cache, installers, package manifests, and release metadata were advanced together to 0.1.11.

## Review 2 finding disposition

| Finding | Disposition |
| --- | --- |
| R2-1 physical Windows/Linux result | External evidence dependency remains. This worker has no GPU. The release makes no lab-result claim and attributes coverage only to a completed user-host run. |
| R2-2 safe cross-vendor paths | Public support is narrowed to the automatic temperature providers that exist. A missing selected-card temperature blocks allocation by default. |
| R2-3 one-time checkout | Operator dependency remains. The live checkout endpoint returns 404, so the site exposes no broken buy link. Public registration metadata is at `/work/.evidence/billing-offer.json`. |
| R2-4 report-only SHA test failures | Closed. Source identity follows `v0.1.11`; site identity may be a later documentation-only descendant. |
| R2-5 wrong Mac architecture | Closed for reported Intel, reported Apple silicon, and unknown architecture. |
| R2-6 untested package-manager paths and stale tap | Closed with three declared public-asset claims and self-repository Homebrew tap instructions. |
| R2-7 30-second hero cache | Closed. Live hashed hero returns `Cache-Control: public, max-age=31536000, immutable`. |

## Earlier finding disposition

The retained regression suite also covers the earlier reused-allocation counter, unknown-memory fallback, Windows/Linux/macOS inventory, selected-adapter telemetry, disappearing/85°C stops, invalid 7,200-second workflow command, strict lint, candidate/release identity, demo storage isolation, touch targets, focus contrast, malformed Report Kit input, raw route metadata, mobile first action, real HTTP 404, offline reload, and installer checksum failures.

Windows and macOS packages remain unsigned. This is disclosed beside installation, and SHA-256 is described only as file-integrity evidence. Signing still needs operator certificates.

## Clean verification

The documented setup was run from a fresh GitHub clone at the implementation SHA:

```sh
npm ci --no-audit --no-fund
# every exact test command in .factory/claims.json, independently
npm test
npm run lint
npm run build
cargo test --locked --all-targets
cargo check --locked --all-targets
cargo package --locked
```

Results:

- 32 of 32 declared claim commands passed.
- Node/integration: 34 passed, one Windows-only local fixture skipped.
- Rust: 14 passed.
- Playwright: 29 passed.
- Lint, production build, Cargo check, and the clean 88-file Cargo package passed.
- `dist/site` and `target/release/vram-fieldtest` were produced.
- GitHub clean-build run `33995228063` passed.
- GitHub release run `33995237338` passed after publishing and checking the three package-manager claims.

## Release and consumer verification

The public v0.1.11 release is non-draft and contains Linux tar/deb/rpm, Windows zip, Intel and Apple-silicon macOS tar/pkg files, per-file checksums, `SHA256SUMS`, `latest.json`, and `PROVENANCE.json`.

A fresh Linux consumer verified the public archive against `SHA256SUMS`, then ran:

- `--version` and `--help`;
- a network-blocked `demo --json`, which wrote a passing three-pattern JSON report and printable HTML;
- `inspect --json` on this GPU-free host;
- 12,288 MiB and 98,304 MiB planning cases;
- missing-consent, invalid-coverage, and missing-adapter recovery paths with exit codes 1, 2, and 1.

The deployed one-line shell installer independently checked the archive, installed v0.1.11 to a fresh directory, and ran the network-blocked demo.

## Live web verification

- `npm run verify:live -- https://vram-fieldtest.sociobot.in` passed landing, Demo, Report Kit, Privacy, Terms, and the deliberate HTTP 404.
- All routes had one h1, a main landmark, no console/page errors, and no serious or critical axe findings.
- `/opt/fleet/lib/verify-url.sh` passed in 666 ms with title, `lang=en`, image alt coverage, and labelled buttons.
- Fresh desktop and 390 by 844 phone contexts showed the job, audience, and complete 49.5 px sample action before scrolling.
- One click loaded Example GPU 12 GB, 93.8% sample coverage, and three patterns under the persistent demo banner.
- Reset recreated only `demo:vram-fieldtest`. Start for real removed that key. A seeded real-data sentinel was unchanged.
- The demo made only same-origin requests and reloaded offline after service-worker control.
- Keyboard, route focus/back, 200% text, reduced motion, 44 px targets, and disclosure focus contrast passed.
- The license endpoint returned 200 for checks 1 through 8. Check 9 returned 429 with `Retry-After: 598`.
- The API stores no tenant or report state. Its rate bucket is deliberately process-local, so SQLite and restart persistence are not applicable to this static product.

Live Lighthouse 12.8.2 mobile scores: performance 100, accessibility 100, best practices 100, SEO 100. FCP was 813 ms, LCP 1,398 ms, TBT 36 ms, and CLS 0.

Built budgets:

- Initial app JavaScript: 7,315 bytes gzip.
- All JavaScript including the worker: 7,867 bytes gzip.
- CSS: 2,546 bytes gzip.
- Hero image: 120,554 bytes.

## Evidence

- `/work/.evidence/repair-12-clean.log`
- `/work/.evidence/repair-12-local/`
- `/work/.evidence/repair-12-live/`
- `/work/.evidence/catalog-description.txt`
- `/work/.evidence/billing-offer.json`

The catalog description is verb-first, 65 characters before its newline, and matches `.factory/catalog-description.txt`.

## Remaining dependencies

1. Run the tagged binary on physical Windows and Linux GPUs and publish completed reports with detected VRAM, at least 90% coverage, three completed patterns, retained allocations, and selected-card telemetry. No physical result is claimed here.
2. The billing operator must register and verify the Report Kit offer before enabling the buy link. The exact product origin is `https://vram-fieldtest.sociobot.in`; the current checkout endpoint returns 404.
3. Add safe Windows AMD/Intel and macOS temperature providers before expanding default real-run support beyond NVIDIA SMI and Linux DRM hwmon.
4. Add macOS and Windows signing certificates when available. Until then, those packages remain clearly labelled unsigned.
5. The owner must submit the prepared winget manifest before `winget install` is publicly available.
