# Verification 12 handoff — PASS

**Verified candidate:** `9c5cdd53e90b98cf895a85e2a94b719881202c45` (`v0.1.10`)
**Live URL:** <https://vram-fieldtest.sociobot.in>

Independent QA passed on 2026-08-30. `.factory/verification-12.md` contains
the exact claim-gate, local, CLI consumer, browser, accessibility, privacy,
release, and rate-limit evidence. The live `release.json` reports this exact
source and site commit. All 29 declared claim commands and the complete suite
passed; `cargo test --locked --all-targets`, lint, and the production build
also passed.

The only finding is Low severity: the un-hashed hero image currently has a
30-second cache lifetime. No Critical, High, or Medium defects were found.
The verifier container has no physical GPU; no physical-memory result is
claimed or inferred.

---

# Repair 11 handoff (historical builder evidence)

**Base verifier report:** `.factory/verification-11.md` at
`469aa85a9d3d481c3ca01db3c8202ebf9910a2ea`

**Release:** `v0.1.10`

**Live URL:** <https://vram-fieldtest.sociobot.in>

## Reproduction and repair

The new `@claim:safe-non-nvidia-default` regression was run before the fix. It
failed because Cargo selected zero tests: the candidate had no inspect-time
safety contract for a non-NVIDIA adapter.

- `inspect` now reports `default_run_ready`, the matched temperature provider,
  and a plain safety note for every listed adapter.
- AMD and Intel fixtures prove that missing selected-adapter temperature blocks
  the default path before test-memory allocation. A fixture with temperature
  proves that the same vendor-neutral path becomes ready.
- The existing 85°C and disappearing-reading stops remain unchanged. The
  explicit `--allow-no-thermal-stop` option remains labelled unsafe.
- Public, README, demo, release-provenance, and claim text now says only that
  the CLI detects and tests the local host. Coverage figures come from
  completed user-provided runs. Release packages contain no factory GPU-lab
  result.
- The evidence helper is described as a schema and consistency checker for a
  report the user provides. Its controlled fixtures are not presented as
  hardware evidence.
- Windows and macOS packages are plainly labelled unsigned. SHA-256 is
  described only as byte-integrity verification, not publisher identity.
- Report Kit checkout remains absent while the Sociobot product mapping is not
  configured. The landing and Report Kit route have no checkout link; the
  free CLI and JSON/HTML reports remain available.

## Exact regression coverage

- `npm test -- --grep @claim:safe-non-nvidia-default`
- `npm test -- --grep @claim:selected-thermal-stop`
- `npm test -- --grep @claim:host-evidence-scope`
- `npm test -- --grep @claim:host-evidence-bundle`
- `npm test -- --grep @claim:release-package-provenance`
- `npm test -- --grep @claim:unsigned-builds`
- `npm test -- --grep @claim:report-kit-operator-gate`

`.factory/claims.json` contains 29 claims and the source contains exactly one
matching `@claim:<id>` test for each claim.

## Local verification

- `npm ci --no-audit --no-fund` — passed; five packages installed.
- `npm test` — passed: 31 Node/integration checks, one Windows-only local skip,
  14 Rust tests, and 29 Playwright desktop/mobile checks.
- `npm run lint` — passed JavaScript and Python syntax, shell syntax, Rust
  formatting, and Clippy with warnings denied.
- `npm run build` — passed; produced `dist/site` and
  `target/release/vram-fieldtest`.
- `cargo test --locked --all-targets` — 14 passed.
- `cargo check --locked --all-targets` — passed.
- `cargo package --locked --allow-dirty` — passed; 81 files, 2.7 MiB
  uncompressed and 2.2 MiB compressed.
- A fresh consumer installed the packaged crate. Its binary reported 0.1.10,
  ran the demo with blocked proxy settings, planned 11,060 MiB for a 12,288
  MiB host value, and returned the sandbox's empty adapter inventory.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173
  artifacts/repair-11-verify` — passed in 636 ms with no console errors, one
  h1, `lang=en`, a main landmark, complete image alt attributes, and labelled
  buttons. Desktop and 390×844 screenshots are in that evidence folder.
- Lighthouse 12.8.2 local mobile/default audit: performance 99,
  accessibility 100, best practices 100, SEO 100; FCP 1.05 s, LCP 2.10 s,
  TBT 34 ms, CLS 0.
- Initial app JavaScript is 6,888 bytes gzip; all JavaScript including the
  worker is 7,430 bytes gzip. CSS is 2,800 bytes gzip and the hero is 120,554
  bytes. All remain below the product budgets.

## Cross-platform package evidence

- Clean build run
  [33298183105](https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33298183105)
  passed at `60f44a3b848d2411fb6bc4e3c685194ce2542554`, including the Windows
  PowerShell good/tampered checksum regression.
- Non-publishing release rehearsal
  [33298191492](https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33298191492)
  passed at the same commit. Linux and Windows software-renderer protocol
  checks passed and are labelled as package checks with no hardware result.
  Native Linux, Windows, Intel macOS, and Apple-silicon macOS builds passed.
- Rehearsal archive SHA-256 values pinned into package-manager manifests:
  - Windows x86_64: `6823b2fe6ae36eeb004e203ce3fd19f333e3da864f01cad326e537774ecc3914`
  - macOS x86_64: `213b882c0edb05cb7b62a6c34d1499b06928fb2ced023b0df5812435b3d9ba66`
  - macOS arm64: `84c995ce062cf48a75bfecaa4d93508b62a4f9ca9b81734b96dcbb36d4c0dd5d`

## Release and deployment

Tag this handoff commit as `v0.1.10`. The tag workflow publishes Linux,
Windows, Intel macOS, and Apple-silicon macOS assets, `SHA256SUMS`,
`latest.json`, and `PROVENANCE.json`. Build the site after the tag so
`release.json` identifies the same source commit, then deploy only this static
product:

```sh
npm run build:site
/opt/fleet/lib/deploy-static.sh vram-fieldtest dist/site
npm run verify:live -- https://vram-fieldtest.sociobot.in
```

## Honest limits

- This sandbox has no GPU. No physical-GPU coverage figure or external GPU
  matrix is claimed. A coverage figure belongs only to the completed local run
  that produced its report.
- A non-NVIDIA host without selected-card temperature remains blocked by
  default. The user can see that status in `inspect`; proceeding without the
  automatic stop requires the explicit unsafe option and manual monitoring.
- Windows and macOS packages are unsigned because no signing certificate is
  available. Checksums verify downloaded bytes only.
- New Report Kit purchases remain unavailable until its Sociobot product
  mapping is configured and checked. The disabled state is fail-soft.
