# Independent verification 8 — FAIL

**Candidate:** `a4bc98619800729dadb9c22f979ea8d6b7f920ee` (`main`)
**Live URL:** <https://vram-fieldtest.sociobot.in>
**Verified:** 2026-08-30 UTC

## Verdict

**FAIL — do not accept this candidate as satisfying the researched brief.**

The deployment, CLI package, demo, accessibility, privacy behavior, safety
controls, and all registered claim tests are healthy. The release-blocking
defect remains the brief's success measure: there is no published or freshly
executed physical **Windows and Linux** GPU test that proves a completed,
three-pattern run covers at least 90% of the VRAM detected on that host.

Published `v0.1.8` `PROVENANCE.json` identifies two protocol runs as
`software-renderer smoke only; not a physical VRAM run`; each is 4 MiB. It
does not provide a physical adapter's non-null detected VRAM and completed
coverage evidence. The release workflow deliberately permits these smoke runs
instead of a physical test matrix. This is a **P0 evidence gap** against both
the researched brief and the factory end-to-end requirement, not a browser
deployment failure.

## Required gates first

### Cold first read and one-click demo — PASS

A new Chromium context loaded the live landing page cold with HTTP 200 and no
console/page errors. Its first screen plainly answers all required questions:

- What: “Test GPU memory before money changes hands.”
- Who: “For buyers, resellers, and repair benches who need a clear memory test
  record.”
- First action: the visible one-click **Try it with sample data** control, with
  “See a finished report and the exact test limits.” beside it.

The action enters the filled Example GPU 12 GB sample. `/demo` provides the
persistent “Demo — sample data, nothing is saved.” banner, Reset demo, and
Start for real. This passes the plain-words and demo-sandbox gates.

### Claims — PASS

`.factory/claims.json` exists and contains 25 claims. From this clean checkout
I ran its listed `npm test -- --grep @claim:<id>` commands (the initial full
claim loop) and then a confirming unfiltered `npm test`. No registered claim
failed. The confirming full run reported:

- 27 Node/integration tests passed;
- 13 Rust tests passed; and
- 29 desktop/mobile Playwright tests passed.

This includes all registered demo, privacy, offline, installer, release,
report-kit, safety, coverage, mobile, and rate-limit claims.

## Clean-checkout quality gates — PASS

- `npm ci`: passed; 5 packages installed and npm reported 0 vulnerabilities.
- `npm test`: passed as above.
- `npm run lint`: passed (JavaScript and shell syntax, `cargo fmt --check`, and
  `cargo clippy --locked -- -D warnings`).
- `npm run build`: passed, producing `dist/site` and
  `target/release/vram-fieldtest`.

The rebuilt initial application JavaScript is 6,769 bytes gzip and all
JS/CSS/worker assets total 10,106 bytes gzip, within the 200 KB JavaScript and
50 KB CSS budgets. The local 121 KB decorative WebP is below the 300 KB mobile
hero budget.

## CLI, package, and recovery exercise — PASS except physical-matrix evidence

I downloaded the real `v0.1.8` Linux archive into a new temporary consumer
directory. Its SHA-256 matched the published `SHA256SUMS`; its binary reported
`vram-fieldtest 0.1.8`; `--help` documented the public commands; and
`demo --json` wrote non-empty local `report.json` and `report.html`.

- Normal preview: `plan --detected-mib 12288 --coverage 90 --window-mib 1024
  --json` returned 11,060 MiB, 11 windows, and 90.0065% *requested* coverage.
- Missing consent: `run --mib 1` exited 1 with the clear `pass --yes` recovery
  instruction.
- Invalid boundary input: coverage 101 exited 2 with the valid `1..=100`
  range.
- This verifier has no adapter (`inspect --json` returned `[]`). A consented
  `run --yes --mib 1` failed safely with “Adapter 0 is not available. Run
  `vram-fieldtest inspect` and choose a listed adapter.”

These results establish safe normal, boundary, invalid-input, and recovery
paths in this environment. They cannot satisfy the missing physical GPU matrix.

## Live deployment, accessibility, privacy, and headers — PASS

`node site/live-verify.mjs https://vram-fieldtest.sociobot.in` passed:

- `/`, `/demo`, `/report-kit`, `/privacy`, and `/terms` returned 200; an
  unknown route returned a true 404.
- Each route had exactly one h1, one main landmark, `lang=en`, a route title,
  no console/page errors, and zero Axe serious/critical findings.
- Keyboard-only Skip to content moved focus to main. The suite also passed
  route focus/back navigation and disclosure Enter/Space behavior.
- At 390 px the page had no horizontal overflow and the primary action measured
  49.5 px high. Reduced motion disabled scrolling animation/transitions.
- Demo request logging observed only `https://vram-fieldtest.sociobot.in`.
  It neither loaded third-party scripts/fonts nor made telemetry requests.
  Offline reload passed after service-worker control. A direct
  `registration.update()` kept `/sw.js` active without console errors.
- Live headers supply CSP, HSTS, `X-Content-Type-Options: nosniff`, and strict
  origin referrer policy. The hashed JavaScript/CSS assets are immutable for a
  year; HTML uses a 30-second revalidation cache policy.

The live response identity is `v0.1.8` source
`f5bec7de1409eb24feb8773f8c23c9949819da54`, the tag immediately preceding the
candidate's documentation/release-metadata commit. This is not a functional
deployment mismatch: a fresh build at `a4bc986` compared byte-for-byte equal
to live for every deployable site file checked (landing, all five physical
routes, 404, release identity, worker, JS, CSS, and mobile CSS). The released
archive and live identity consistently name `f5bec7d`.

## License allowance — PASS

From one client, I sent nine distinct invalid-license requests to the live
`/api/license/verify` endpoint. Requests 1–8 returned 200. Request 9 returned
HTTP 429 with `Cache-Control: no-store`, body
`{"valid":false,"reason":"rate_limited"}`, and `Retry-After: 596`.
Observed allowance: **eight checks per network address per rolling ten
minutes**, as documented. There is no sign-in flow, so the Entra tenant check
does not apply.

## Defects by severity

### P0 — no physical Windows/Linux VRAM-coverage evidence

The product's required success measure is a reproducible report with usable
coverage for at least 90% of *detected* VRAM on Windows and Linux. The public
release contains only labelled 4 MiB software-renderer smoke records. The
current verifier host has no GPU, and no supplied evidence replaces the two
required physical runs. Do not infer physical coverage from `plan`, demo data,
or software rendering.

**Required remediation:** run the tagged binary on a physical Windows GPU and
a physical Linux GPU with detected VRAM, preserve their JSON/HTML reports and
checksums, and publish evidence showing non-null detected VRAM, >=90% completed
coverage, all three patterns complete, selected-adapter thermal telemetry, and
reproducible commands. Then re-run independent verification.
