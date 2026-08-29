# Independent verification 3 — FAIL

**Candidate:** `16eb91d65285e4eea2b99fc59aa26f548491b5e3` (`main`)  
**Live URL:** <https://vram-fieldtest.sociobot.in>  
**Verified:** 2026-08-29 UTC

## Verdict

**FAIL — do not release this candidate.** The live static bundle is byte-for-byte
the candidate's generated JS, but the published installer release is explicitly
provenanced to an earlier commit. A visitor's download therefore cannot be
verified as candidate `16eb91d`; this fails the required live/candidate match
for a `cli-installers` product.

## Release-blocking defect

### P0 — published CLI release is not traceable to the candidate

- GitHub latest release is `v0.1.2` (published `2026-08-29T15:07:17Z`).
- Its public `PROVENANCE.json` and `latest.json` both state
  `source_commit: e586f3759f878ea5897b1a0fdebab8aceee0e71d`.
- The requested candidate is the later commit
  `16eb91d65285e4eea2b99fc59aa26f548491b5e3`. `e586f37` is an ancestor, not
  the candidate. The candidate changes release workflow/package manifests and
  claims after the tag, so the archive cannot stand in for it.
- The live site serves `app.11daf8d1d7c2.js`; its SHA-256 is
  `11daf8d1d7c279b51e9b0b35214606c386672ce7e502ededf65e4319a44793ea`, equal
  to the candidate build output. That does not cure the separately installed
  CLI provenance mismatch.

**Required repair:** tag and publish a release from `16eb91d` (or a clearly
identified descendant), with all platform assets, `SHA256SUMS`, `latest.json`,
and `PROVENANCE.json` naming that commit; then deploy a bundle whose release
tag/manifest refers to it and re-run downloaded-archive verification.

## First-read and demo gate — PASS

An uncached live landing load plainly says **“Test GPU memory before money
changes hands.”** It names **buyers, resellers, and repair benches**, and its
first action is **“Try it with sample data”**, with the immediate outcome
“See a finished report and the exact test limits.” One click opens `/demo`,
which displays the realistic bundled sample report and persistent **“Demo —
sample data, nothing is saved.”** banner with Reset demo and Start for real.

## Required claims gate — PASS

From this clean checkout, after `npm ci` (5 packages; 0 vulnerabilities), every
exact command in `.factory/claims.json` passed:

- `@claim:demo-report`, `@claim:demo-sample`, `@claim:cli-local`,
  `@claim:safety-consent`, `@claim:high-vram-coverage`,
  `@claim:installer-checksum`
- `@claim:release-download`, `@claim:release-provenance`,
  `@claim:site-offline`, `@claim:demo-privacy`,
  `@claim:report-kit-output`, `@claim:license-rate-limit`,
  `@claim:unlock-allowance`

## Local source and CLI checks — PASS

Commands passed: `npm test`, `npm run build`, `cargo fmt --check`,
`cargo clippy --locked -- -D warnings`, and `cargo package --locked --allow-dirty`.
The full suite reported 15 Node tests, 4 Rust tests, and 16 Playwright tests
passing. Production build generated `dist/site` and `target/release/vram-fieldtest`.
Cargo packaging verified 52 files.

Manual release-binary checks:

- Candidate release build: `demo --json` wrote a report; `plan --detected-mib
  98304 --coverage 90 --window-mib 16384 --json` returned `requested_mib:
  88474`, `coverage_percent: 90.00040690104166`, and `windows: 6`.
- No-consent real run stopped before adapter work with the documented
  `pass --yes` message (exit 1). Invalid and zero plan input returned clear
  Clap validation errors (exit 2). A consented 1 MiB run in this container
  safely reported no usable adapter and advised `demo`; no physical GPU was
  available to test actual VRAM.
- Fresh consumer archive test downloaded
  `vram-fieldtest-linux-x86_64.tar.gz`; SHA-256 matched `SHA256SUMS`, its
  binary reported `vram-fieldtest 0.1.2`, and its demo plus exact 96 GiB plan
  succeeded. This validates the old/provenanced release's function, not its
  identity as the candidate.

## Live UX, privacy, accessibility, and headers — PASS

- `/opt/fleet/lib/verify-url.sh` passed: 868 ms load, title/lang, exactly one
  h1, main landmark, zero missing alt attributes, zero unlabeled buttons, and
  no console errors.
- Fresh desktop and 390 px mobile sessions had no console/page errors. The
  skip link received focus; Enter moved focus to main. Mobile had no horizontal
  overflow (`390/390`) and the primary demo target was 49.5 px high. Reduced
  motion produced `scroll-behavior: auto`, no animation, and 0 s transition.
- Live `/demo` traffic was same-origin only, ignored a real-license sentinel,
  and reloaded offline after service-worker control with its heading/banner.
  Report Kit rejected invalid JSON with a recovery message and, with a cached
  fixture license, rendered the local sample's printable cover and three labels
  without a verification request.
- Axe found zero serious/critical violations on `/`, `/demo`, `/report-kit`,
  `/privacy`, `/terms`, and a real 404 page. Direct documented routes returned
  200; an unknown route returned HTTP 404.
- Response headers include CSP, HSTS, `nosniff`, and strict-origin referrer
  policy. Hashed JS returned `Cache-Control: public, max-age=31536000,
  immutable`; the initial local assets are 16,625 B JS, 7,417 B CSS, and
  120,554 B hero WebP (within stated budgets).
- Live unlock enforcement was independently observed: requests 1–8 from one
  client returned 200; requests 9–10 returned 429 with `Retry-After: 598`.
  Observed allowance: **8 checks per network address per rolling 10 minutes**.
  There is no sign-in flow; paid checkout uses the permitted Sociobot endpoint.

## Known limits

This verification environment has no usable GPU, so it cannot establish the
brief's Windows/Linux physical-hardware coverage target. The no-adapter path,
demo, planning behavior, safety consent, and report output were tested.
