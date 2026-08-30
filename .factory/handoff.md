# Repair 10 handoff

**Base verifier report:** `.factory/verification-10.md` at
`56f5a272c8ffd0d86c9d36a35572dcaba61face0`

**Release candidate:** `v0.1.9` from the final `main` commit for this repair.

## What changed

- Reproduced the verifier's stale-release failure before changing code: a
  built `v0.1.8` site identified the old `v0.1.8` tag commit as its release
  source while its `site_commit` was the newer candidate.
- Bumped every release-facing version to `0.1.9` and added a regression that
  builds the site and requires `tag`, `source_commit`, and `site_commit` to
  be the current candidate. Installer scripts, service-worker cache, sample,
  release fixtures, package metadata, and package-manager manifests are kept
  in the same version contract.
- Reworded host-coverage copy and provenance. The CLI detects and tests the
  GPU on the user's host. Coverage evidence comes only from completed user
  runs on those hosts. The product provides no physical Windows or Linux GPU
  coverage claim; CI software-renderer jobs are package checks only.
- Added `@claim:host-evidence-scope` browser/documentation regression coverage
  for that scope and retained the completed user-host evidence validator.
- Kept Windows and macOS downloads explicitly unsigned. SHA-256 checks verify
  file integrity and are not presented as code signing.
- Kept Report Kit checkout fail-soft while the Sociobot product mapping is
  environment-gated. The free core test and report files remain available.
- Ran a non-publishing native GitHub Actions rehearsal and used its artifacts
  to pin the `v0.1.9` Windows, Intel macOS, and Apple Silicon macOS package
  manager checksums.

## Verification

- `npm ci` — passed with 0 vulnerabilities.
- `npm test` — passed: 31 Node/integration checks (one Windows-only local
  PowerShell fixture skipped), 13 Rust unit tests, and 29 Playwright desktop
  and mobile checks. This includes keyboard, 390 px layout, 200% text,
  reduced motion, axe serious/critical checks, privacy, offline reload,
  update handling, response behavior, checkout gating, and the new scope and
  release-identity regressions.
- `npm run lint` — passed: JavaScript/Python/shell syntax, Rust formatting,
  and Clippy with warnings denied.
- `npm run build` — passed and produced `dist/site` plus
  `target/release/vram-fieldtest`.
- `cargo package --locked --allow-dirty` — passed and produced
  `target/package/vram-fieldtest-0.1.9.crate`.
- Fresh consumer install from that crate — passed. The installed binary
  reported `vram-fieldtest 0.1.9`; its demo wrote local JSON and HTML output;
  a 12 GiB/90% plan requested 11,060 MiB over 11 windows.
- GitHub Actions rehearsal
  [33294717372](https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33294717372)
  passed on clean Linux verification, Linux and Windows software-renderer
  package protocol checks, Windows, Linux, macOS x86_64, and macOS arm64
  native builds. It did not publish a release.

## Scope and operator actions

- The product does not claim factory-provided physical Windows or Linux GPU
  coverage. User-host evidence must be a completed report from the host that
  ran the tool and is validated by `scripts/hardware-evidence.py`.
- Windows and macOS installers are unsigned. Signing/notarization needs the
  owner's platform certificates; checksum verification remains in place.
- Report Kit checkout is intentionally unavailable until an operator configures
  the Sociobot product mapping and verifies a hosted one-time purchase.

## Publish and deploy

Tag the final candidate as `v0.1.9`; `.github/workflows/release.yml` then
publishes the all-platform release assets, `SHA256SUMS`, `latest.json`, and
`PROVENANCE.json`. Build the site after that tag so `release.json` records the
same tag commit, then deploy `dist/site` with:

```sh
npm run build:site
/opt/fleet/lib/deploy-static.sh vram-fieldtest dist/site
npm run verify:live -- https://vram-fieldtest.sociobot.in
```
