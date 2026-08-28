# VRAM Field Test v0.1.1 — independent verification: **FAIL**

Candidate verified: `99a70a94e075848ab3b33491a7bb287d095afec3` at
<https://vram-fieldtest.sociobot.in> on 2026-08-28 UTC.

**Do not release this candidate.** Independent verification found that the
16,384 MiB hard cap prevents the brief's required ≥90% coverage on high-VRAM
cards (only 16.67% of a 96 GiB card); the CLI does not capture thermals or
clocks and its time limit cannot interrupt an in-progress pattern; strict
Clippy fails; and the paid-unlock allowance/429 contract is undocumented and
unverified. The complete evidence is in
[`verification-1.md`](verification-1.md). All ten declared claims, the exact
production build, web accessibility/privacy checks, deployment-match check,
and released Linux consumer smoke test passed.

---

# Previous builder repair handoff

## Outcome

Candidate `764a720ffdce44a095d0d75db15b0c46f1cb2ff3` failed before its build because `package.json` had no lockfile. The failure was reproduced with npm 10.9.8: `npm ci` exited 1 with `EUSAGE` and “can only install with an existing package-lock.json”.

The root cause is fixed on `main`. `package.json` pins `npm@10.9.8`; the npm 10.9.8-generated `package-lock.json` is synchronized at lockfile version 3. A focused test copies only both package files into a fresh temporary directory and proves `npm ci` succeeds. The same gate is the first dependency step in `.github/workflows/ci.yml` and the release workflow.

The product remains a `cli-installers` artifact. The repair also:

- replaced the retired `macos-13` job with `macos-15-intel`;
- added current Windows, Linux, Intel macOS, and Apple silicon builds;
- published tar/zip archives, two macOS `.pkg` files, `.deb`, `.rpm`, `SHA256SUMS`, and `latest.json`;
- fixed the shell installer’s real checksum bug: it now retains the release filename before running `sha256sum -c` or `shasum -a 256 -c`;
- published checksummed Homebrew, Scoop, and winget manifests;
- added one-click CLI and web demos, an offline/update service worker, and the local-file Report Kit flow;
- added claim, mobile, keyboard, accessibility, privacy, update, release-fallback, installer, and route tests.

## Clean install and build evidence

Toolchain: Node `v22.23.2`, npm `10.9.8`, Rust stable.

The exact build command passed locally:

```sh
npm ci && npm test && npm run build
```

Final local result: 9 Node/integration checks passed, 2 Rust unit tests passed, and 13 Playwright tests passed. `dist/site/index.html` and `target/release/vram-fieldtest` were produced. `cargo package --locked --allow-dirty` packaged and verified `vram-fieldtest-0.1.1.crate`.

A fresh remote clone at commit `46ea1daf93c6df4cf59f74095ec0a488fdf3a82f` ran the same exact command successfully: 8 Node/integration checks, 2 Rust tests, 13 browser tests, site build, and release binary build all passed. The later commits only add optimized art, verified release hashes, package metadata, one update-policy test, and this handoff; the final local exact command passed again after those changes.

All ten commands in `.factory/claims.json` were then run separately and passed:

```sh
npm test -- --grep @claim:<claim-id>
```

GitHub clean-build runs:

- [33194852548](https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33194852548) — clean clone at `46ea1da`, success.
- [33195283109](https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33195283109) — release source `f1e5459`, success.
- Run `33196257708` verifies the final manifest commit `0c83fde`.

The container exposes no usable GPU adapter. `cargo run -- run --yes --mib 1 --seconds 10` stopped safely with exit 1 and “No usable GPU adapter found”. Demo, argument bounds, consent, reporting, packaging, and failure behavior were verified; a real VRAM pass could not honestly be run without GPU hardware.

## Release evidence

Release: [v0.1.1](https://github.com/B-Divyesh/sf-vram-fieldtest/releases/tag/v0.1.1). Workflow [33195293646](https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33195293646) completed successfully, including verify, four native build jobs, and publish.

All 18 assets were downloaded. `sha256sum -c SHA256SUMS` reported `OK` for all eight packages:

- Linux x86_64 tar.gz: `01b0d29be1a092503edad71ca981ed900c1d0e2816f2a58b2ec63fa6b62508ba`
- Debian amd64: `a0d335497de20e01929bdfcfba6dee0765806cdd74ba73230f2df68a82ea3e70`
- RPM x86_64: `abbed07256d802a910e69f5255848bcc8b0b5b41778f7dd88b42a5ba96b1da70`
- Windows x86_64 zip: `083b8ee0c73a05ef0a0d9bd11bbb1160cb1b8e464f619c0bbf7aa9d16bdabc81`
- macOS arm64 tar.gz: `3a138c008e6a8e3e9334a8605979c6cb93ba0aaed64cf72256ac38501a6fad25`
- macOS x86_64 tar.gz: `1187de63af88a1dcaf09b0ddd0058b92407789fdd26d7049640320c3b13966f4`
- macOS arm64 pkg: `4370d86c507d0660e5b7eaf27280dd8d876d142c2f75015da5a393af431a0a43`
- macOS x86_64 pkg: `c15abbb61262286a2c1c153fa24c8e6f7e06d9ba915a919cc96571a7ee7a675f`

`latest.json` parses and lists all eight package URLs. The released Linux binary reports `vram-fieldtest 0.1.1`; its demo wrote both report formats. The real shell installer downloaded that release, verified its checksum, installed it into an isolated path, and the installed binary reported 0.1.1.

Homebrew tap: [B-Divyesh/homebrew-vram-fieldtest](https://github.com/B-Divyesh/homebrew-vram-fieldtest), formula commit `3a5884a0393f0db79c7008df121ad03de52651a1`. Scoop manifests are in both `scoop-bucket/` and the functional `bucket/` directory. The winget singleton manifest contains the published Windows checksum.

## Deployment and live verification

Production: [https://vram-fieldtest.sociobot.in](https://vram-fieldtest.sociobot.in). Azure Static Web Apps resource `sf-vram-fieldtest` is in `centralus`; the managed custom domain is `Ready` with HTTPS 200. The last uploaded static bundle was 152,520 bytes.

The required `verify-url.sh` passed live with:

```json
{"loadMs":654,"errors":[],"a11y":{"title":"VRAM Field Test — Test GPU memory","lang":"en","h1":1,"main":true,"imgsMissingAlt":0,"buttonsUnlabeled":0,"textLength":2192}}
```

Live Playwright/axe checks covered `/`, `/demo`, `/report-kit`, `/privacy`, `/terms`, and the designed missing-page route. Every route returned the expected title, one `<h1>`, one `<main>`, zero console errors, and zero serious/critical axe findings. The demo reloaded while the browser was offline. `install.sh`, `install.ps1`, `robots.txt`, `sitemap.xml`, and `sw.js` return 200. The detected Linux download links to the real 2,536,298-byte release archive and resolves to HTTP 200.

Live mobile Lighthouse: performance 100, accessibility 100, best practices 100, SEO 100; LCP 1,510 ms, total blocking time 26 ms, CLS 0, total transfer 133,947 bytes. Built source sizes are 15,180-byte JS, 7,417-byte CSS, and 120,554-byte hero WebP.

## Known gaps and operator actions

1. The Sociobot billing catalog does not list `vram-fieldtest`; the required checkout URL currently returns HTTP 404 with `{"error":"enabled factory product","status":404}`. The verification endpoint is live and the licensed Report Kit path is fixture-tested, but the factory operator must register/enable the `$19` product before a purchase can complete. No billing administration credential or `fleet/new-paid-product.sh` was available in this worker.
2. Run `vram-fieldtest run --yes --mib <safe-size>` on actual NVIDIA, AMD, Intel, and Apple GPU hardware. Save reports for the hardware support matrix. The container’s lack of a GPU is the only unexecuted core hardware path.
3. Windows and macOS artifacts are unsigned, as stated on the site. Add signing/notarization only after the owner provides `WINDOWS_CERT_PFX` and `APPLE_CERTIFICATE` secrets.
4. Submit `winget/vram-fieldtest/vram-fieldtest.yaml` to `microsoft/winget-pkgs`; owner submission is outside this repository.
5. Linux uses the GNU target rather than static musl. `wgpu` needs the host graphics-loader stack, so a glibc build is the honest portable choice for this GPU CLI.
