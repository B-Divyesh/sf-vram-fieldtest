# VRAM Field Test — release repair handoff

## Status

Repaired and released as `v0.1.3`. The static site and every offered installer
are tied to the same tagged source commit. The original `cli-installers`
artifact and static Azure deployment class are unchanged.

## Verifier finding reproduced

Candidate `16eb91d65285e4eea2b99fc59aa26f548491b5e3` was newer than release
`v0.1.2`. Both public `PROVENANCE.json` and `latest.json` named ancestor
`e586f3759f878ea5897b1a0fdebab8aceee0e71d`. The release tag resolved to that
same ancestor. The site only compared `v0.1.2`, so a matching version label
could hide the source mismatch.

## Repair

- `v0.1.3` is published only by an exact version tag. The workflow asserts the
  checked-out commit equals `GITHUB_SHA` before it builds.
- Manual workflow dispatches build all four native targets but cannot publish.
  This supports a package rehearsal before the final tag.
- `scripts/package-release.py` creates deterministic `.tar.gz` and `.zip`
  archives. Formula, Scoop, and winget hashes can now be committed before the
  release commit is tagged.
- Windows uses MSVC's reproducible-link flag so the PE timestamp and debug
  identity remain stable across clean release builds.
- The release job validates the staged Linux archive, publishes all artifacts,
  downloads the archive again, verifies its checksum, and repeats the exact
  96 GiB plan. It also checks both public provenance files against the tag SHA.
- Each site build writes uncached `/release.json` from its Git commit. The
  landing page resolves the public Git tag and offers downloads only when that
  commit equals the deployed identity. An old cached release is refreshed
  immediately when its version differs.
- Both one-line installers compare `/release.json`, the public tag commit, and
  `PROVENANCE.json` before verifying the archive checksum or installing.

## Exact regression coverage

- `regression: installer refuses the expected tag when it points at an ancestor commit`
- `regression: landing refuses an expected release tag from another commit`
- `regression: native archive packaging is byte reproducible`
- `@claim:release-provenance` checks tag/version/source equality, dispatch-only
  rehearsals, staged and downloaded 96 GiB plans, checksum verification, and
  both public provenance manifests.
- The release-facing version test rejects placeholder hashes and keeps Cargo,
  npm, site, service worker, installers, Formula, Scoop, and winget on 0.1.3.
- The release-update browser test starts with a fresh cached `v0.1.2` response
  and proves the page replaces it with `v0.1.3`.

Focused commands:

```sh
npm test -- --grep @claim:release-provenance
npm test -- --grep 'ancestor commit|another commit|byte reproducible'
npm test -- --grep @claim:installer-checksum
```

## Verification evidence

Clean/local gates:

```sh
npm ci
npm test
npm run lint
npm run build
cargo package --locked --allow-dirty
```

- Clean npm install: 5 packages, 0 vulnerabilities.
- All 13 exact commands in `.factory/claims.json` pass independently.
- Suite: 17 Node unit/integration tests, 4 Rust tests, and 18 Chromium tests.
- Chromium covers desktop, 390 px mobile, keyboard focus, 200% text, offline
  reload, update behavior, privacy traffic, real 404 behavior, and all routes.
- Axe: zero serious or critical issues on `/`, `/demo`, `/report-kit`,
  `/privacy`, `/terms`, and the designed 404.
- Strict checks: JavaScript syntax, shell syntax, Rust format, and Clippy with
  warnings denied all pass.
- Production build writes `dist/site` and `target/release/vram-fieldtest`.
- Cargo package verification: 55 files, 330.6 KiB.
- Fresh `cargo install --locked --path .` consumer reports 0.1.3, writes the
  demo JSON and HTML, returns the exact six-window 96 GiB plan, rejects 101%
  coverage with exit 2, requires `--yes`, and gives the documented no-adapter
  recovery message in this container.
- Local Lighthouse mobile: performance 100, accessibility 100, best practices
  100, SEO 100; LCP 1,355 ms, CLS 0, total blocking time 1 ms.
- Initial assets: JavaScript 17,595 B raw / 6,366 B gzip; CSS 7,417 B raw /
  2,431 B gzip; hero WebP 120,554 B.

Non-publishing native matrix rehearsals:

- <https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33261439507>
- <https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33261753557>
- <https://github.com/B-Divyesh/sf-vram-fieldtest/actions/runs/33262110739>

The second run reproduced the first run's release archive hashes after the
package manifests were committed:

| Artifact | SHA-256 |
|---|---|
| Linux x86_64 archive | `4a5127a5fdcb9bfb7868c5eae6f3eda16dbc027db45cde90cd2c70eb689b3dda` |
| Windows x86_64 archive | `a6283ef9d01e6cbd00a343ffcc37f5c24be69caaf647334e95d79042779dc613` |
| macOS Apple silicon archive | `336e3243293bb965909423b60290f0cc4566c65b8fa2df7d75197effbbcc1e1d` |
| macOS Intel archive | `b076d00a6338621d4d7c0292f43768e095140f3ba85867ebdc0190ba2cdb9e58` |

Public release checks use
<https://github.com/B-Divyesh/sf-vram-fieldtest/releases/tag/v0.1.3>:

```sh
curl -fsSL https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.3/PROVENANCE.json
curl -fsSL https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.3/latest.json
curl -fsSL https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.3/SHA256SUMS
```

`source_commit` in both JSON files equals `git rev-parse v0.1.3`. Every entry
in `SHA256SUMS` passes. A fresh Linux archive reports 0.1.3 and returns
`requested_mib: 88474`, coverage at least 90%, and six windows.

The final static build was deployed with:

```sh
/opt/fleet/lib/deploy-static.sh vram-fieldtest dist/site
/opt/fleet/lib/verify-url.sh https://vram-fieldtest.sociobot.in <evidence-dir>
```

Live checks cover desktop and 390 px mobile, keyboard, reduced motion, 200%
text, offline demo reload, same-origin demo traffic, zero serious or critical
Axe issues, no console errors, headers and cache policy, a real HTTP 404,
release identity, the downloaded archive, and the server's eight-check license
allowance with 429 plus `Retry-After` on the ninth request.

## Known limits and operator action

- This container has no usable physical GPU. The safe no-adapter path, demo,
  report output, and high-VRAM planner are verified. Physical Windows and Linux
  GPU coverage remains an operator hardware-matrix task.
- macOS and Windows artifacts are unsigned. The owner must provide signing
  certificates for signed packages.
- The winget manifest is ready, but the owner must submit it upstream.
