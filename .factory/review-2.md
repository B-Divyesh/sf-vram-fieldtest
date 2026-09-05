# Review 2 — Test GPU memory and save a local report

**Verdict: FAIL**

**Implementation reviewed:** `9c5cdd53e90b98cf895a85e2a94b719881202c45`
(`v0.1.10`)

**Documentation checkout:** `430837f7ee1d7e72d42b7d6198015d0f88c3cc95`

**Live URL:** <https://vram-fieldtest.sociobot.in>

**Reviewed:** 2026-09-05 UTC

The live product is the tagged implementation. All 20 deployable files matched
a fresh build of `9c5cdd5` byte for byte. The later documentation commit changes
only `.factory/handoff.md` and `.factory/verification-12.md`, so a new product
image is not expected.

This review found **7 defects**: 0 Critical, 2 High, 4 Medium, and 1 Low.
It ran all 29 declared claim commands. Three public package-manager install
paths are not registered claims. The result therefore cannot be PASS.

## First screen before scrolling

Fresh desktop and 390 × 844 phone contexts gave the same clear first answer:

- Job: **“Test GPU memory before money changes hands.”**
- Audience: buyers, resellers, and repair benches needing a memory-test record.
- First action: **“Try it with sample data.”**

The phone action occupied 252.7 × 49.5 CSS pixels and ended at y=571.5, inside
the 844-pixel viewport. There was no horizontal overflow. The desktop action
also appeared without scrolling. The cassette-service-record design matched
`.factory/design.md` and remained visually specific to this product.

## Findings

### R2-1 — High — the required physical Windows/Linux result is still absent

The brief's success measure calls for a reproducible matrix showing at least
90% of detected VRAM on Windows and Linux. The `v0.1.10` release contains
packages, checksums, `latest.json`, and `PROVENANCE.json`, but no completed
physical-GPU reports. Its provenance explicitly says that it is a package
release with no factory GPU-lab result.

The installed CLI correctly planned 11,060 MiB for 12,288 MiB and 88,474 MiB
for 98,304 MiB. Those are planning results, not completed GPU tests. This host
has no GPU (`inspect --json` returned `[]`), so it could not supply the missing
evidence. Public copy correctly limits coverage figures to completed user runs,
but the source-of-truth acceptance outcome remains unproved.

### R2-2 — High — safe cross-vendor runs remain unavailable on common hosts

The safe default requires a selected-card temperature before allocation. That
is correct safety behavior. The implementation can obtain temperature from
`nvidia-smi` or Linux DRM hwmon only. It has no AMD/Intel temperature provider
on Windows and no temperature provider on macOS. Those users are stopped before
the test unless they select `--allow-no-thermal-stop`, which disables the
brief's required thermal guard.

The new `inspect` readiness field and the refusal path close the earlier unsafe
behavior, but they do not complete the cross-vendor Vulkan/Metal/DirectX job.

### R2-3 — Medium — the one-time purchase path is unavailable

The researched product specifies one-time monetization and the paid-unlock
contract requires a buy link, exact price, and working hosted checkout. The
landing and Report Kit pages instead state that checkout is unavailable;
`reportKitCheckout` is `null`. License restore works for an operator-issued
token, and the free CLI remains usable, but a new customer cannot buy Report
Kit.

### R2-4 — Medium — the current clean checkout fails its required test gates

From documentation SHA `430837f`, `npm test` failed the release-identity
regression. The site builder correctly produced source commit `9c5cdd5` and
site commit `430837f`, but the test requires both fields to equal `HEAD`.
The Node result was 30 passed, 1 failed, and 1 skipped; Cargo and Playwright did
not run because the runner stopped on that failure.

`npm run verify:live -- https://vram-fieldtest.sociobot.in` also failed because
it requires the deployed `site_commit` to equal GitHub `main`. That conflicts
with the work-order rule that report-only commits do not require a new product
deployment. The live product itself is not mixed: its tagged source and all
deployed bytes are correct.

For comparison, a fresh checkout of implementation SHA `9c5cdd5` passed the
complete suite: 31 Node tests passed with one Windows-only skip, 14 Rust tests
passed, and 29 Playwright tests passed.

### R2-5 — Medium — the Mac download button can serve the wrong architecture

A fresh Intel Mac browser user agent received:

`vram-fieldtest-macos-aarch64.tar.gz`

The page selects the first asset containing `macos` and does not select an
architecture. That archive cannot run on an Intel Mac. The shell installer
does use `uname -m` and selects correctly, but the prominent detected-platform
download does not. The declared `release-download` claim test covers Windows
only, so it missed this platform boundary.

### R2-6 — Medium — documented package-manager installs are outside claims, and Homebrew is stale

README documents Homebrew, Scoop, and winget paths, but none has its own entry
in `.factory/claims.json`. The repository formula and Windows manifests name
`0.1.10` and their checksums match published assets. However, the public tap
used by the documented command still serves formula `0.1.6` with `v0.1.6`
URLs. Running the README Homebrew command therefore installs an old release,
not the reviewed product.

Untested public claim count: **3** package-manager paths.

### R2-7 — Low — the hero image still has a 30-second cache lifetime

`hero-vram-small.webp` is served with `Cache-Control: public,
must-revalidate, max-age=30`. Fingerprinted JS and CSS use one-year immutable
caching. This is the Low finding from verification 12 and is unchanged.

## One-click sample and recovery paths

The live demo passed its product flow:

- One click opened a populated Example GPU 12 GB report.
- It showed 11,520 / 12,288 MiB, a 93.8% sample value, three patterns, and zero
  mismatches.
- The persistent banner said “Demo — sample data, nothing is saved.”
- Reset removed and recreated only `demo:vram-fieldtest`.
- A seeded real-license sentinel was neither read nor changed in demo mode.
- Start for real removed the demo key and preserved the sentinel.
- Every demo request was same-origin.

Report Kit read the bundled report locally, produced one cover and three batch
labels, and made no request after upload. Malformed JSON cleared the output and
showed a direct recovery instruction.

The released Linux artifact passed checksum verification in a new consumer
folder. `--help`, `demo --json`, `inspect --json`, and 12 GiB/96 GiB plans
worked. The network-blocked demo wrote `report.json` and `report.html` to a
temporary folder. Missing consent exited 1; invalid 0 MiB, 101% coverage,
16,385 MiB batches, and an unknown command exited 2; an unknown adapter exited
1 with an `inspect` instruction. The live one-line shell installer also
verified the checksum and installed `vram-fieldtest 0.1.10` in a fresh folder.

## Claims and clean-checkout gates

`.factory/claims.json` contains 29 entries. Source scanning found exactly one
matching `@claim:<id>` tag per entry, no extra tags, and the expected command
for every entry. Each of the 29 exact commands was executed separately after
`npm ci`; all passed.

| Check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | PASS |
| All 29 declared claim commands | PASS |
| `npm test` at documentation SHA | **FAIL** — R2-4 |
| `cargo test --locked --all-targets` | PASS — 14/14 |
| `npm run lint` | PASS |
| `npm run build` | PASS — `dist/site` and release binary created |
| `cargo check --locked --all-targets` | PASS |
| `cargo package --locked --allow-dirty` | PASS |
| Full `npm test` at implementation SHA | PASS |
| `npm run verify:live` from current main | **FAIL** — R2-4 |

## Live web, accessibility, privacy, and performance

- `/`, `/demo`, `/report-kit`, `/privacy`, and `/terms` returned 200. A missing
  path returned a deliberate styled HTTP 404 with a route title and return link.
- Every rendered route had `lang=en`, one h1, header/nav/main/footer landmarks,
  a route-specific title and description, and zero serious/critical axe issues.
- Keyboard Tab first reached the skip link with a 4 px orange focus ring. Enter
  moved focus to main. Route changes focused the new h1; Back restored the route.
- All visible phone controls across every route measured at least 44 × 44 CSS
  pixels. Doubling root text size caused no horizontal overflow or lost
  header/main/footer. Reduced motion had no running animation.
- The service worker updated and `/demo` reloaded offline with its title, h1,
  sample, and banner. No browser console or page errors were observed.
- All discovered internal links returned 200. Raw route responses carried
  distinct title, description, canonical, Open Graph, and Twitter metadata.
- CSP, HSTS, `nosniff`, and strict referrer policy were present. The demo loaded
  no analytics, CDN script, external font, or cross-origin resource.
- Lighthouse mobile retry: performance 100, accessibility 100, best practices
  100, SEO 100; FCP 797 ms, LCP 1,512 ms, TBT 31 ms, CLS 0.
- Initial JS was 6,888 bytes gzip, CSS 2,533 bytes gzip, and the hero 120,554
  bytes. All are within budget.

## Release and server boundaries

The public release is non-draft and includes Linux tar/deb/rpm, Windows zip,
Intel and ARM macOS tar/pkg files, per-file checksums, `SHA256SUMS`,
`latest.json`, and `PROVENANCE.json`. Downloaded Linux, Windows, and both macOS
archives matched the published checksums. The Scoop and winget hashes matched
the Windows archive; the in-repository formula hashes matched both macOS
archives. Release and clean-build workflows for `9c5cdd5` completed
successfully.

The license function accepted eight distinct invalid checks from one client.
The ninth returned 429, `reason: rate_limited`, and `Retry-After: 598`. A
missing token returned 400 and `invalid_request`. The function has no tenant
workspace or report storage; browser reports remain local and license validity
comes from the product-scoped upstream. Restart persistence and SQLite are not
applicable to this static product's ephemeral rate bucket. `/api/health` is not
a declared route; its 404 is not treated as a broken product page.

No sign-in tenant exists. No AI feature is needed for this diagnostic CLI:
local JSON/HTML export and Report Kit import already cover the obvious useful
transfer step.

## Earlier finding disposition

| Earlier issue | Current disposition |
| --- | --- |
| Reused-window coverage and fixed small fallback | Closed by retained unique allocations and current Rust regressions. |
| Missing Windows/Linux/macOS VRAM enumeration | Closed in source and native build checks. |
| Missing or wrong-card thermal stop | Unsafe behavior closed; selected-card refusal works. Cross-vendor provider coverage remains open as R2-2. |
| Invalid 7,200-second workflow command | Closed; workflow uses the accepted 900-second boundary. |
| Lint failures | Closed; strict lint passes. |
| Release/candidate mismatch | Closed for `v0.1.10`; all live bytes match `9c5cdd5`. Current report-only gate behavior is R2-4. |
| License allowance absent | Closed; live 8/9 behavior matches policy. |
| Demo read real license storage | Closed; live instrumentation observed only the demo namespace. |
| Touch targets and focus contrast | Closed on all live routes. |
| Malformed Report Kit parser text | Closed with a plain recovery message. |
| HTTP-200 missing page | Closed; missing paths return styled HTTP 404. |
| Route metadata, mobile first action, jargon, and decorative headings | Closed; raw metadata and fresh phone/desktop first-read checks pass. |
| Missing physical matrix | Still open as R2-1. |
| Paid checkout unavailable | Still open as R2-3. |
| Unsigned macOS/Windows packages | Deliberately disclosed and allowed by the installer contract's unsigned fallback; checksums do not claim publisher identity. |
| Hero image cache | Still open as R2-7. |

## Required next work

1. Publish independently reviewable physical Windows and Linux reports showing
   completed ≥90% coverage, with retained allocations and selected-card data.
2. Add safe temperature providers for the supported non-NVIDIA Windows and
   macOS paths, or narrow supported real-run platforms.
3. Configure the Sociobot product mapping and complete the one-time checkout.
4. Make identity checks distinguish tagged implementation SHA from later
   report-only documentation SHA.
5. Select macOS architecture correctly and update the public Homebrew tap.
6. Register and test every documented package-manager install path.
7. Version or long-cache the hero image.
