# Verification 12 — PASS

**Candidate:** `9c5cdd53e90b98cf895a85e2a94b719881202c45` (`v0.1.10`)
**Live URL:** <https://vram-fieldtest.sociobot.in>
**Verified:** 2026-08-30

## Result

PASS. The deployed `release.json` identifies both `source_commit` and
`site_commit` as the candidate commit. The first cold live screen plainly says
that it tests GPU memory before purchase/resale, names buyers/resellers/repair
benches, and puts **Try it with sample data** first. That action opens the
isolated demo in one click.

## Required claim gate

`.factory/claims.json` exists and contains 29 claims. From the clean
`npm ci` install, every listed `npm test -- --grep @claim:<id>` command was
executed individually against its demo entry point. The subsequent complete
`npm test` run passed; its Playwright result is `passed` with no failed tests.
This exercised all 29 claim checks, including demo output and no-network
operation, privacy request logging, offline reload, reports, safety consent,
thermal stops, installer checksums, release selection, Report Kit local-file
handling, and the license rate-limit contract.

## Local verification

- `npm ci` — passed; no audit vulnerabilities reported.
- `npm test` — passed (including Node/integration, Rust, and Playwright claim
  coverage; Playwright `test-results/.last-run.json` reports `passed`).
- `cargo test --locked --all-targets` — 14 passed, 0 failed.
- `npm run lint` — passed, including Rust format and Clippy with warnings
  denied.
- `npm run build` — passed; created `dist/site` and
  `target/release/vram-fieldtest`.
- Clean release consumer — downloaded
  `vram-fieldtest-linux-x86_64.tar.gz`, verified its SHA-256 against the
  published `SHA256SUMS`, extracted it in a new temp directory, and ran
  `--help`, `demo --json`, and `inspect --json`. The demo emitted a local
  temporary report and inspect returned the sandbox's empty inventory.
- CLI boundaries — normal 12,288 MiB / 90% plan requested 11,060 MiB;
  missing `--yes` stopped with exit 1 before running; invalid 101% coverage
  stopped with exit 2; unknown adapter stopped with exit 1 and a corrective
  message.

## Live verification

- `npm run verify:live -- https://vram-fieldtest.sociobot.in` — all six
  checked routes returned their expected 200/404 status, no console errors,
  no axe serious/critical findings, 390 px page width equalled scroll width,
  primary target was 49.5 px high, offline demo reload passed, and release
  identity matched the candidate.
- Independent cold desktop and 390 x 844 mobile Playwright checks found no
  page or console errors and no axe serious/critical findings. Keyboard Tab
  reaches the skip link and demo controls with a visible `4px` focus ring.
  Reduced-motion context rendered cleanly. The demo request log contained
  only same-origin HTML, CSS, and JS requests; it sent no sample data away.
- Homepage headers include HSTS, `nosniff`, strict referrer policy, and CSP
  with `frame-ancestors 'none'`. Public routes returned 200, unknown route
  returned a styled 404, and hashed JS/CSS use `max-age=31536000, immutable`.
  Built initial JS is 6,840 bytes gzip and CSS is 2,506 bytes gzip.
- The public GitHub release is non-draft and contains Linux tar/deb/rpm,
  Windows zip, Intel and Apple-silicon macOS tar/pkg artifacts, checksums,
  `latest.json`, and `PROVENANCE.json`. `latest.json` names the candidate
  commit and platform archives.
- Privacy/rate limit — the browser demo made only same-origin requests. A
  live verification client made eight invalid license checks successfully;
  its ninth received `429` with `Retry-After: 593`. This matches the
  documented allowance of eight checks per address per ten minutes.

## Defects by severity

- Critical: none.
- High: none.
- Medium: none.
- Low: `hero-vram-small.webp` is served with `cache-control: public,
  must-revalidate, max-age=30`, unlike the immutable hashed JS/CSS. This does
  not block the release budget or functionality, but a versioned/long-lived
  hero asset would reduce repeat-visit transfer.

## Known limits

The verification container has no physical GPU, so no physical GPU-memory run
was possible. The product accurately scopes coverage to a completed run on the
user's own host; its GPU-free plan, consent, selected-adapter, thermal-stop,
and report paths were exercised here.
