# Independent verification 4 — PASS

**Candidate:** `4e52a7ab293b9306bbff5233a43480044b55f00a` (`main`)  
**Live URL:** <https://vram-fieldtest.sociobot.in>  
**Verified:** 2026-08-29 UTC

## Verdict

**PASS.** The deployed static bundle, the `v0.1.3` installer release, and the
candidate all identify the same commit. This independently clears the earlier
deployment-only provenance failure.

## First read and one-click demo — PASS

A cold desktop load states, in plain words: **“Test GPU memory before money
changes hands.”** It says it is for **“buyers, resellers, and repair benches”**
and the first primary action is **“Try it with sample data”**, immediately
explained as seeing a finished report and exact test limits. One click opens
`/demo`, showing the realistic bundled GPU result plus the persistent **“Demo —
sample data, nothing is saved.”** banner, Reset demo, and Start for real.

## Mandatory claims gate — PASS

From this checkout, `npm ci` installed 5 packages with 0 vulnerabilities.
Every exact command listed in `.factory/claims.json` passed independently:

- `@claim:demo-report`, `@claim:demo-sample`, `@claim:cli-local`,
  `@claim:safety-consent`, `@claim:high-vram-coverage`,
  `@claim:installer-checksum`
- `@claim:release-download`, `@claim:release-provenance`,
  `@claim:site-offline`, `@claim:demo-privacy`,
  `@claim:report-kit-output`, `@claim:license-rate-limit`, and
  `@claim:unlock-allowance`

The complete `npm test` then passed 17 Node checks, 4 Rust unit tests, and 18
Playwright tests. An additional `npm run test:browser` run passed all 18
browser tests.

## Local build, consumer, and CLI exercise — PASS

- `npm run lint` passed JavaScript and shell syntax checks, `cargo fmt --check`,
  and `cargo clippy --locked -- -D warnings`.
- Exact production `npm run build` passed and produced `dist/site` and
  `target/release/vram-fieldtest`.
- `cargo package --locked --allow-dirty` packaged and verified 56 files.
- A fresh `cargo install --locked --path . --root <temp>` consumer installed
  `vram-fieldtest 0.1.3`. Its `demo --json` produced a report; its 96 GiB plan
  returned 88,474 MiB, 90.00040690104166% coverage, and six windows.
- Boundary and recovery paths behaved correctly: a run without `--yes` exited
  1 before adapter work; `--coverage 101` exited 2 with Clap’s valid range;
  the consented 1 MiB run found no usable adapter in this container and gave
  the documented driver/demo recovery message.

## Published installer and live/candidate identity — PASS

- `git rev-parse v0.1.3` is exactly
  `4e52a7ab293b9306bbff5233a43480044b55f00a`.
- Live `/release.json`, GitHub `PROVENANCE.json`, and release `latest.json`
  all name `v0.1.3` and that exact source commit.
- The live `assets/app.bd5237281bf4.js` SHA-256 is
  `bd5237281bf4bbe27de5dc9a399d3f6a99ca9bd694beed21f6af1720de7b76c4`,
  identical to this candidate’s `dist/site` output.
- GitHub Release `v0.1.3` exposes Linux tarball, `.deb`, and `.rpm`; Windows
  x86_64 zip; macOS Intel and Apple-silicon tarballs and `.pkg`s; plus
  checksums and both provenance manifests.
- A fresh download of `vram-fieldtest-linux-x86_64.tar.gz` passed
  `sha256sum -c SHA256SUMS`, reported `0.1.3`, wrote its demo output, and
  returned the same six-window 96 GiB plan.

## Live UX, privacy, security, and accessibility — PASS

- `npm run verify:live -- https://vram-fieldtest.sociobot.in` passed. It found
  200 responses for `/`, `/demo`, `/report-kit`, `/privacy`, and `/terms`; a
  real 404 for an unknown route; zero serious/critical Axe findings; zero
  console errors; offline `/demo` reload after service-worker control; and the
  exact candidate release identity.
- A separate `/opt/fleet/lib/verify-url.sh` check reported 923 ms load, title,
  `lang=en`, one h1, main landmark, no missing image alt text, no unlabeled
  buttons, and no console errors.
- Desktop keyboard testing focused Skip to content first and Enter moved focus
  to `main`. At 390 px, there was no horizontal overflow (390/390) and the
  primary target measured 49.5 px. Reduced motion removed animation and
  transitions. Browser test coverage also passed 200% text, route/back focus,
  invalid Report Kit input recovery, and the local printable report flow.
- Playwright’s complete `/demo` request log contained only the site origin; it
  ignored a pre-seeded real-license sentinel. No sign-in flow exists. The
  optional paid path uses the allowed Sociobot checkout/verify endpoint.
- Live response headers include CSP, HSTS, `X-Content-Type-Options: nosniff`,
  and strict-origin referrer policy. The hashed JS is immutable-cached for one
  year. Initial built assets are 17,595 B JS (6,364 B gzip), 7,417 B CSS
  (2,425 B gzip), and a 120,554 B WebP hero, within the stated budgets.
- Live rate-limit exercise from one synthetic client observed 200 for requests
  1–8 and 429 with `Retry-After: 599` for requests 9–10: **8 license checks
  per network address per rolling 10 minutes**.

## Defects

No release-blocking, critical, high, medium, or low defects were observed.

## Environment limitation / follow-up

This container exposes no usable GPU. The verifier exercised planning, safety
consent, no-adapter recovery, local report/demo output, and the downloaded
installer, but could not independently perform a physical GPU memory run.
Before making hardware-coverage claims beyond the tested protocol, retain the
planned Windows and Linux physical-GPU matrix check.
