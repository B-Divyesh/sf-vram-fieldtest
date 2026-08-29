# Independent verification 2 — FAIL

**Candidate:** `7cf53e1269aa16d73ec5550932f2a57bcab6b712` (`main`)  
**Live URL:** <https://vram-fieldtest.sociobot.in>  
**Verified:** 2026-08-29 UTC

## Verdict

**FAIL — do not release.** The live static site is the candidate bundle, but
the live installer downloads an older CLI that does not contain the candidate's
high-VRAM coverage implementation. This violates the core `cli-installers`
acceptance contract and makes the landing-page coverage claim untrue for the
download a visitor receives.

## Release-blocking defects

### P0 — published installer is not the candidate CLI

- GitHub's current release is `v0.1.1`, published `2026-08-28T17:40:05Z`.
  The candidate's product-code repairs are in `aed596f` and later; `v0.1.1`
  points at `f1e5459`, before those changes.
- The live landing page selects
  `vram-fieldtest-linux-x86_64.tar.gz` from that release and labels it
  `v0.1.1 · 2 MB`.
- Its SHA-256 correctly matches the release `SHA256SUMS`, but unpacking it and
  running
  `vram-fieldtest plan --detected-mib 98304 --coverage 90 --window-mib 16384 --json`
  returns exit 2: `error: unrecognized subcommand 'plan'`.
- The candidate build and a clean consumer install do provide `plan`; the same
  command returns `requested_mib: 88474`, `coverage_percent:
  90.00040690104166`, and `windows: 6`.

Publish/tag platform assets built from the candidate (with checksums and an
updated `latest.json`), then retest the downloaded asset rather than only the
source tree.

### P1 — product unlock endpoint did not enforce a server-side allowance

The documented browser behaviour is one background license check per 24 hours.
Using a single client and harmless invalid tokens, I called
`GET https://api.sociobot.in/api/v1/products/vram-fieldtest/verify?...` 20
times in immediate succession. Every response was HTTP 200 with
`{"valid":false,"reason":"invalid"}`; none returned HTTP 429 or a
`Retry-After` header. The observed server allowance is therefore greater than
20 / not enforced in this test. The required server-side 429 enforcement for
product-unlock calls was not demonstrated.

### P2 — the live missing-page response is HTTP 200

`HEAD /missing-page` on the live deployment returns HTTP 200 and the SPA shell,
not the configured HTTP 404. The client renders its styled not-found screen,
but crawlers and non-JS clients receive a successful response. Deploy the
`responseOverrides` 404 behaviour and verify a real HTTP 404.

## First-read and demo check

Cold load of `/` plainly says: “Test GPU memory before money changes hands.”
It names buyers, resellers, and repair benches, and presents the first action
“Try it with sample data” with the outcome “See a finished report and the exact
test limits.” The one-click `/demo` path showed the bundled sample report plus
the persistent “Demo — sample data, nothing is saved.” banner. This check
passed.

## Required claim tests — all passed locally

After `npm ci` (5 packages; 0 vulnerabilities), each exact command listed in
`.factory/claims.json` passed:

- `@claim:demo-report`
- `@claim:demo-sample`
- `@claim:cli-local`
- `@claim:safety-consent`
- `@claim:high-vram-coverage`
- `@claim:installer-checksum`
- `@claim:release-download`
- `@claim:site-offline`
- `@claim:demo-privacy`
- `@claim:report-kit-output`
- `@claim:license-rate-limit`

The mocked `release-download` and installer fixture tests do not prove that the
real published archive contains the candidate code; the P0 test above is why
the release still fails.

## Local source and CLI verification — passed

```sh
npm test
npm run build
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo package --locked --allow-dirty
```

Results: 10 Node tests, 4 Rust unit tests, and 14 Playwright tests passed;
the production site and release binary built successfully; package verification
passed. A clean `cargo install --path . --root <temp>` consumer install passed
`--help`, `demo --json`, a 96 GiB plan, invalid `--coverage 101` recovery, and
the no-`--yes` safety refusal. `demo` produced three patterns, JSON, and HTML.
This container has no usable GPU, so a physical GPU run stopped safely with the
documented no-adapter message; no hardware-matrix assertion is made.

## Live site, privacy, accessibility, and performance checks — passed except P2

- Live `index.html`, JS, and CSS exactly match the candidate build:
  `app.31726075ea9d.js` SHA-256
  `31726075ea9d41d60b7ef871c28ca85224ce6ec276a34e449dc3c48b758929ed` and
  `styles.a1525eb3feb1.css` SHA-256
  `a1525eb3feb1b4de6ea182ea8bea93ff3bb112ba37642c93baad679e2c67c261`.
- Fresh desktop and 390 px mobile loads had no console/page errors, no
  horizontal overflow, working skip-link keyboard focus, and no serious or
  critical axe findings.
- `/opt/fleet/lib/verify-url.sh` on the live landing passed: title, `lang=en`,
  one h1, main landmark, image alt coverage, labelled controls, 929 ms load,
  and no errors.
- A clean `/demo` session requested only same-origin document/CSS/JS; it made
  no telemetry or third-party request. After service-worker control, offline
  reload retained the demo heading and banner without errors.
- Initial compressed assets are 5,978 B JS and 2,425 B CSS. Hero WebP is
  120,554 B. The hashed JS/CSS assets return
  `Cache-Control: public, max-age=31536000, immutable`; `sw.js` returns
  `no-cache`. CSP, HSTS, `nosniff`, and strict-origin referrer policy are
  present.
- The site has no sign-in flow. Optional billing is through the permitted
  Sociobot endpoint; P1 concerns its missing observed rate limit.

