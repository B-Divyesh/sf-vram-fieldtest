# Handoff\n\n(written by the worker at the end of each work order)
## VRAM Field Test v0.1.0 handoff

### What shipped

- Rust single-binary CLI with `inspect`, explicit-consent `run`, and `demo` commands.
- WebGPU compute writes solid AA, solid 55, and walking-address patterns to a GPU storage buffer. It reads every word back and writes local `report.json` plus print-ready `report.html`.
- Bounded defaults, a 16 GiB requested-size ceiling, a real elapsed-time stop between patterns, and an NVIDIA temperature stop where `nvidia-smi` exposes it. The output makes tested MiB and driver-reported VRAM coverage separate.
- Bundled CLI sample and a `/demo` site route with isolated sample data and reset/start-for-real controls.
- Static cassette-era-zine landing page, legal routes, installer scripts, release workflow, Scoop/winget/Homebrew submission templates, CSP and static hosting config.
- Optional $19 one-time Report Kit checkout and browser-side license restore/verification flow. The core test and both report formats remain free.

### How verified

```sh
npm test
npm run build
npm test -- --grep @claim:demo-report
./target/release/vram-fieldtest demo --json
```

All commands passed. `dist/site/index.html` is created by `npm run build:site`. The demo test asserted three sample patterns, 93.75% sample coverage, JSON output, and HTML output. The optimized hero is 253,254 bytes; app JS is 11,722 bytes and CSS is 6,517 bytes before transfer compression. `git diff --check` passed.

The disposable worker has no usable GPU adapter, so a real `run --yes --mib 1` correctly stopped with “No usable GPU adapter found.” Hardware execution must be completed on the Windows/Linux release matrix with real adapters. This is a known validation gap, not a synthetic pass.

### Known gaps and operator actions

- `main` and tag `v0.1.0` were pushed. GitHub Actions release run [33191918210](https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33191918210) had completed successful Linux, Windows, and arm64 macOS build jobs when last checked; the x64 macOS runner remained queued. The first run failed before jobs due to YAML expression syntax and was superseded by this corrected run. Do not claim a published release until the queued job and publish job complete. Release-time automation must fill each `REPLACE_WITH_RELEASE_SHA256` value in the Homebrew, Scoop, and winget templates from `SHA256SUMS`, then publish the tap and submit the winget manifest.
- macOS and Windows artifacts are unsigned. Signing requires the owner’s `APPLE_CERTIFICATE` and `WINDOWS_CERT_PFX` secrets; then add signing/notarization steps before making a trust claim.
- The initial v0.1 WebGPU backend records thermal values only where `nvidia-smi` is available. AMD/Intel/Metal/DX vendor telemetry needs a platform adapter before the report can include clocks and temperatures across every platform.
- The requested MiB is clamped to the storage-buffer limit exposed by the adapter. Test a high-memory card with a size covering at least 90% of driver-reported VRAM before claiming that target on the landing page.

### Next steps

1. Run release CI on a tag and verify Linux, Windows, and both macOS download checksums.
2. Exercise `vram-fieldtest run --yes --mib <size>` on the hardware matrix; save resulting reports as release evidence.
3. Register the paid product with Sociobot, then test checkout return and license verification on the production domain.
