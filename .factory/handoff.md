# Verification 5 handoff — FAIL

## Result

**FAIL — do not release candidate
`29c3388117383aa6e46a3564afff9102d7eeb057`.**

Independent evidence is in `.factory/verification-5.md`. The deployed static
site at <https://vram-fieldtest.sociobot.in> matches this candidate's build,
and the published v0.1.3 installers are reachable and checksum-valid. The
release remains blocked by core CLI coverage defects and a required lint
failure.

## Blocking findings

- **P0:** the high-VRAM “coverage” number sums repeated, disposable 64 MiB
  allocations. The implementation does not keep or address distinct VRAM, so
  it cannot prove that 90% of the card was tested. The claim test checks only
  planning arithmetic.
- **P0:** VRAM size detection is Linux-only and relies on one sysfs field.
  Windows always has no detected total; unsupported Linux drivers fall back to
  the same state. A default real run then silently tests 256 MiB and reports no
  coverage. The CLI also cannot enumerate/select multiple adapters.
- **P1:** `npm run lint` fails because `cargo fmt --check` rejects
  `src/main.rs:990`.
- **P1:** live demo mode reads `sb_license:vram-fieldtest` before checking demo
  mode, contrary to its license-isolation promise.
- **P2:** the 390 px download target is 40 px high, below the 44 px minimum.
- **P2:** malformed Report Kit JSON exposes the browser parser message rather
  than a plain recovery instruction.

No product code was modified during verification.

## Verification summary

- All 22 exact claim commands passed after clean `npm ci`.
- Exact `npm ci && npm test && npm run build` passed.
- Full tests: 21 Node/integration, 5 Rust, and 23 Playwright passed.
- `npm run test:browser`, `cargo test --locked`, `cargo check --locked`,
  `cargo clippy --locked -- -D warnings`, and
  `cargo package --locked --allow-dirty` passed.
- `npm run lint` and `cargo fmt --check` failed on one unformatted line.
- Fresh source consumer install, live installer, downloaded release archive,
  checksum, demo, help, error paths, and 96 GiB plan were exercised.
- Live routes, 404, desktop, 390 px mobile, keyboard, focus, reduced motion,
  200% text, offline reload, Report Kit recovery, request logs, headers,
  caching, and Axe serious/critical checks were exercised.
- Lighthouse mobile: 99 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.5 s, TBT 140 ms, CLS 0.
- License allowance: eight 200 responses per address per ten minutes, then 429
  with `Retry-After`; the concurrent burst also enforced eight.

## How to reproduce

```sh
npm ci
npm test
npm run test:browser
npm run build
npm run lint
cargo test --locked
cargo check --locked
cargo clippy --locked -- -D warnings
cargo package --locked --allow-dirty
npm run verify:live -- https://vram-fieldtest.sociobot.in
```

For the core defect, inspect `exercise_pattern`, `exercise_gpu_chunk`,
`inventory`, and `linux_vram` in `src/main.rs`, then compare them with the
arithmetic-only `@claim:high-vram-coverage` test.

## Environment limit

This container exposes no usable physical GPU. It could not perform a real
Windows/Linux GPU test matrix. That missing evidence does not cause the FAIL:
the shipped source itself shows that automatic coverage is absent on Windows
and that sequential disposable buffers do not establish distinct VRAM
coverage.
