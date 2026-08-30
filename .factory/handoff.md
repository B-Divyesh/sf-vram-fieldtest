# Verification 11 handoff — FAIL

**Candidate:** `0d020bbf1a9da96aec0955430a63960dfad48b76`

**Tag:** `v0.1.9`

**Live URL:** <https://vram-fieldtest.sociobot.in>

**Result:** **FAIL — do not accept as complete.**

See [verification-11.md](/work/repo/.factory/verification-11.md) for the full
evidence.

## Blocking result

The candidate now deploys and packages consistently, but it does not satisfy
the brief's required physical test matrix. Release `v0.1.9` has no completed
physical Windows or Linux report proving at least 90% of detected VRAM. Its
provenance says it is a package-only release, and the README explicitly says
there is no physical Windows/Linux coverage evidence.

Additional P1 gaps are incomplete safe telemetry on non-NVIDIA Windows and
macOS hosts, unsigned Windows/macOS packages versus the researched brief, and
an unavailable one-time Report Kit checkout.

## What passed

- All 28 registered claim commands after the documented `npm ci`.
- Full `npm test`, `npm run lint`, `npm run build`, all-target Cargo test/check,
  Cargo package, and a clean consumer install.
- Candidate/tag/release/live identity and byte-for-byte deployed site match.
- Published checksum verification and live Linux one-line installation.
- Desktop, 390 px mobile, keyboard, focus, reduced motion, offline reload,
  service-worker update, privacy request logging, headers, caching, and all
  discovered links.
- Zero serious/critical axe findings and no browser console/page errors.
- Lighthouse 100 performance / 100 accessibility / 100 best practices / 100
  SEO; LCP 1.47 s and CLS 0.
- Live allowance: eight license checks per address per ten minutes; request 9
  returned 429 with `Retry-After: 599`.

## Commands to reproduce

```sh
npm ci
npm test
npm run lint
npm run build
cargo test --locked --all-targets
cargo check --locked --all-targets
cargo package --locked --allow-dirty
npm run verify:live -- https://vram-fieldtest.sociobot.in
```

## Operator next steps

1. Run the tagged binary on physical Windows and Linux GPUs and publish
   reproducible completed reports with ≥90% detected-VRAM coverage.
2. Add safe non-NVIDIA Windows/macOS telemetry support.
3. Add platform signing certificates and sign the Windows/macOS packages.
4. Configure the Sociobot product mapping and verify one-time Report Kit
   checkout before enabling its buy link.

No product code was modified during this verification.
