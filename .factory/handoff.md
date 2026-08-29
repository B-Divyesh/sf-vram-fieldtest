# Repair 5 handoff — PASS

## Result

All six release-blocking findings in `.factory/verification-5.md` for candidate
`29c3388117383aa6e46a3564afff9102d7eeb057` are repaired and covered by exact
regressions. The researched brief, visual thesis, static deployment class, free
core workflow, and previously passing behavior are preserved.

- Live site: <https://vram-fieldtest.sociobot.in>
- Release: <https://github.com/B-Divyesh/sf-vram-fieldtest/releases/tag/v0.1.5>
- Release source: `368ca99c115d318c3f82aa4e4e9696b2470eb14c`
- Final repair branch: `main`

## Repaired findings

1. **Distinct VRAM coverage:** real runs now allocate multiple distinct WebGPU
   storage buffers, clear and commit each allocation, retain every allocation
   through all three patterns, and address each allocation with a unique global
   offset. Reports expose retained MiB, allocation count, and residency
   evidence. Reported coverage is the byte count common to all three completed
   patterns; an incomplete run reports zero completed coverage.
2. **Adapter discovery and memory totals:** `inspect` now lists indexed WebGPU
   adapters. `run --adapter N` selects one. Windows uses DXGI
   `DedicatedVideoMemory`; Linux reads each DRM card and falls back to
   `nvidia-smi`. A missing total now stops automatic coverage with a specific
   `--mib` instruction instead of silently testing 256 MiB.
3. **Strict formatting:** the original `cargo fmt --check` failure is fixed.
   `npm run lint` now passes, including Clippy with warnings denied.
4. **Demo storage isolation:** demo mode is checked before any paid-license
   read or write. Instrumented browser coverage proves that `/demo` touches only
   `demo:vram-fieldtest`, even when a real license key already exists.
5. **Mobile download target:** the dynamically published download link now
   honors its 44 px minimum. It measures 45 CSS px at a 390 px live viewport.
6. **Malformed Report Kit input:** browser parser details are replaced by:
   “This file could not be read. Choose a valid VRAM Field Test report.json
   file.”

Live release testing also found and repaired a one-line installer edge case:
GitHub sometimes returns minified commit JSON. The shell installer now parses
both minified and formatted responses, while both installers require the
deployed tag and commit to match. The checksum claim includes a minified JSON
fixture that failed before this change.

## Regression coverage

- `tests::retained_high_vram_protocol_reports_only_common_completed_coverage`
  models a 96 GiB card as 88,474 MiB retained across 1,383 distinct allocations
  and verifies that all three patterns completed before coverage is reported.
- `tests::automatic_run_refuses_an_unknown_memory_total` covers the removed
  silent fallback.
- Linux multi-card and NVIDIA inventory parsers have unit coverage. A Windows
  target compile checks the DXGI path.
- Browser regressions cover demo storage accesses, the live download target,
  and the exact malformed-file recovery copy.
- The installer checksum claim now serves minified GitHub-style commit JSON.
- All 22 entries in `.factory/claims.json` were run through their exact
  `npm test -- --grep @claim:<id>` commands; all 22 passed.

## Local verification

The final tree passed this clean matrix:

```sh
npm ci
npm test
npm run build
npm run lint
cargo test --locked
cargo check --locked
cargo clippy --locked -- -D warnings
cargo package --locked --allow-dirty
cargo check --locked --target x86_64-pc-windows-gnu
cargo clippy --locked --target x86_64-pc-windows-gnu -- -D warnings
```

Evidence:

- `npm ci`: 0 vulnerabilities.
- `npm test`: 23 Node/integration, 9 Rust, and 25 Playwright tests passed.
- Browser coverage includes desktop, 390 px mobile, keyboard focus and history,
  200% text, reduced motion, offline reload/update behavior, privacy request
  capture, all physical routes, real 404, and Axe on every route.
- `npm run build`: produced `dist/site` and the release CLI.
- `cargo package`: verified 68 files; 1.5 MiB unpacked, 1.3 MiB compressed.
- Fresh `cargo install --locked --path . --root <temp>` consumer: version,
  help, demo, and 96 GiB JSON plan passed. The plan requests 88,474 MiB in six
  16,384 MiB windows and reports at least 90%.
- Local real WebGPU protocol on Mesa Vulkan: 130 MiB retained in three live
  allocations; all three patterns passed with zero mismatches.
- Initial site payload: JS 19,154 bytes raw / 6,674 gzip; CSS 7,771 bytes raw /
  2,525 gzip; hero WebP 120,554 bytes.
- `.factory/copy-audit.md` remains clean: no sentence exceeds 22 words and no
  banned term appears. The user-facing landing copy did not change.

## Release and package evidence

- Staging workflow `33273618485`: PASS on source `0bc7efa`; verification,
  Linux/Vulkan protocol, Windows/DX12 protocol, and all four native builds
  passed.
- Tagged workflow `33274097445`: PASS on exact release source `368ca99`; all
  jobs and the post-publication identity/checksum gate passed.
- `PROVENANCE.json` identifies `368ca99`, records the 96 GiB plan above, and
  contains two real retained-allocation runs:
  - Linux, Vulkan, llvmpipe: 4 MiB resident, one allocation, three patterns pass.
  - Windows, DX12, Microsoft Basic Render Driver: 4 MiB resident, one
    allocation, three patterns pass.
- All eight installable assets in `SHA256SUMS` were downloaded and passed
  `sha256sum -c`: Linux tar/deb/rpm, Windows zip, two macOS tarballs, and two
  macOS pkg files.
- Package-manifest hashes match the published files:
  - Windows zip: `41bd4b7522d529c82d43aa089f9c807fb19d5e3de305adeadbd1a7b4103573a7`
  - macOS x86_64 tar: `f59687d3ff301e032923f179fa36b51227a1e8d3ce9a004ec140daded35a80f0`
  - macOS arm64 tar: `2610356eecc3e9b92f837fb43dab0aaac99afb049eda2c2f7c024d1ed05e87b9`
- The separate Homebrew tap was updated and pushed at `79c2e38`.
- The live `curl | sh` path verified the archive checksum, installed version
  `0.1.5` into a fresh directory, and passed help, demo, and 96 GiB plan checks.

## Deployment and live verification

Azure Static Web Apps deployment `754d0df9-b97c-4f8d-a2bb-4bf4e18bd9b5`
completed successfully from `dist/site` with the managed API.

- `/release.json` returns tag `v0.1.5` and exact source `368ca99`.
- `/`, `/demo`, `/report-kit`, `/privacy`, and `/terms` return 200; an unknown
  route returns the designed 404.
- Browser console and page errors: zero. Every route has one `h1`, a `main`,
  route-specific title, `lang="en"`, and zero serious/critical Axe findings.
- At 390×844 there is no horizontal overflow; the primary action measures
  49.5 px and the published download target measures 45 px.
- Keyboard skip navigation moves focus to `main`; route focus/history,
  reduced motion, and 200% text passed.
- Demo reload passed offline. Its requests were same-origin only, and storage
  instrumentation recorded no access outside the demo namespace.
- The live malformed-file message matches the regression exactly.
- Live response policy: requests 1–8 returned 200; request 9 returned 429 with
  `Retry-After: 599`. A missing token returned 400 with `Cache-Control: no-store`.
- Security headers include CSP with `frame-ancestors 'none'`, HSTS,
  `nosniff`, and strict-origin referrer policy. Hashed assets are immutable;
  the service worker is `no-cache`.
- Lighthouse mobile: 100 performance, 100 accessibility, 100 best practices,
  100 SEO; FCP 806 ms, LCP 1,354 ms, TBT 21 ms, CLS 0.

## Remaining operator notes

There are no known release-blocking gaps. The worker and hosted release runners
do not expose a physical discrete GPU. They verified retained allocations on
Linux/Vulkan and Windows/DX12 software adapters; the 130 MiB local run exercised
multiple live allocations. A physical high-VRAM run remains normal field
validation, not simulated release evidence.

Windows and macOS packages remain intentionally unsigned. Signing requires the
owner's certificates. The winget manifest is ready but still requires owner
submission to `microsoft/winget-pkgs`.
