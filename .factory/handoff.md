# Independent verification 6 handoff — FAIL

## Result

**FAIL — do not release candidate
`300d827016807803a4d3b7716f8c7a937becc405`.** Fresh verification of
<https://vram-fieldtest.sociobot.in> confirms that the prior deployment-only
failure is resolved, but the acceptance contract is not met. Full evidence and
reproduction details are in `.factory/verification-6.md`.

## Release blockers

1. The CLI continues hardware stress when temperature telemetry is unavailable,
   while reporting an 85°C limit. Telemetry is also not bound to `--adapter`, so
   multi-GPU runs can monitor the wrong card.
2. The required Windows/Linux hardware matrix proving at least 90% detected
   VRAM coverage does not exist. Published runs test 4 MiB on software
   renderers with `coverage_percent: null`; the 96 GiB claim test fabricates
   passing pattern records rather than running a GPU.
3. macOS packages cannot enumerate VRAM, so their default 90% Metal run cannot
   start without a manually supplied `--mib` value.
4. Keyboard/touch baseline defects remain: both `<summary>` controls have a
   1px, ~2.01:1 browser-default focus outline; Demo's Reset button is 32px high;
   the footer Terms link is 41.2px wide.
5. Several README/legal safety and behavior promises are absent from
   `.factory/claims.json`, including incomplete-report behavior on thermal/time
   stops and exit code 2 on a detected mismatch.

## What passed

- Cold first-read and one-click sample demo on desktop and 390px mobile.
- After `npm ci`, all 22 listed claim commands independently.
- `npm test` (23 Node/integration, 9 Rust, 25 Playwright), `npm run lint`, exact
  `npm run build`, `cargo test --locked --all-targets`, and
  `cargo package --locked --allow-dirty`.
- Fresh packaged-crate install, CLI demo, boundary/invalid inputs, consent
  guard, JSON output, local reports, and 96 GiB planning.
- Live/static byte equality, v0.1.5 GitHub release assets, Linux checksum,
  live shell installer, Homebrew tap, Scoop and winget hashes.
- Live routes/404, console, axe, privacy request log, Report Kit local import,
  offline reload/update, headers, caching, link crawl, and reduced motion.
- Lighthouse mobile: 98 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.4s, TBT 170ms, CLS 0.
- Live API allowance: eight 200 responses per client in ten minutes, then 429
  with `Retry-After` (597 seconds observed on request 9).

## Identity and deployment

- Candidate: `300d827016807803a4d3b7716f8c7a937becc405`
- Live release: v0.1.5, source
  `368ca99c115d318c3f82aa4e4e9696b2470eb14c`
- The candidate is the release commit plus a handoff-only commit. Every checked
  generated product file matched live byte-for-byte.
- Candidate clean-build workflow `33274711235`: success.
- Tagged release workflow `33274097445`: success.

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

See `.factory/verification-6.md` for the exact CLI cases, request/caching
evidence, release checks, severity, and required repairs. No product code was
modified during verification.
