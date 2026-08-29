# Adversarial first-read review 1 — VRAM Field Test

**Reviewed:** 2026-08-29 UTC · **Live:** <https://vram-fieldtest.sociobot.in>  
**Verdict: FAIL**

## First 30 seconds

Cold desktop and fresh 390 × 844 mobile loads plainly identify a local
GPU-memory test for buyers, resellers, and repair benches. The intended first
action is **“Try it with sample data.”** The exact hero says:

> “Test GPU memory before money changes hands.”
>
> “For buyers, resellers, and repair benches who need a clear memory test record.”
>
> “Try it with sample data” / “See a finished report and the exact test limits.”

Desktop exposes the action. At 390 × 844, the two-line header and hero image
push the primary button to y=820, where it is clipped below the viewport. The
job and audience are understandable, but the actionable first step is not
fully available before scrolling.

## Findings

### F-1-1 — BLOCKING — mobile first screen hides the primary action

**Location:** live `/`, fresh 390 × 844 Chromium context. **“Try it with
sample data”** begins at y=820 and its 44 px target extends below the bottom of
the viewport.

**Why:** a cold phone visitor must scroll before they can perform the specified
first action; the decorative image is prioritised over the demo entry point.

**Fix:** at this breakpoint put headline, audience sentence, CTA, and facts
before the image, or shrink/reposition the image until the entire CTA is
visible. Add a 390 × 844 Playwright assertion that the primary target's bounding
box is fully inside the initial viewport.

### F-1-2 — BLOCKING — material promises are absent from claims.json

**Location:** landing and README; exact statements are flagged **C** in the
audit below. `.factory/claims.json` covers the CLI demo, no network/telemetry,
consent, planning, installer checksum, release provenance, demo offline/privacy,
Report Kit output, and rate limits. It does not cover the listed promises.

**Why:** these are visitor-reliant promises, not labels. The claims contract
requires a sandbox test for every claim-like sentence. Passing all existing
claim tests does not prove a promise that is not listed.

**Fix:** for each **C** line either (a) add a claim ID and an observable test
that proves the exact scope, or (b) delete/narrow it. In particular add tests
for unauthenticated core output/free access; pricing/one-time entitlement;
real-run JSON/HTML/report schema; output path; storage; unavailable-VRAM,
timeout/thermal/failure/`--json` paths; sample equality; release-signing state;
and build/deployment statements. Do not attach a line to `demo-report` or
`cli-local` unless that test proves the specific sentence.

### F-1-3 — HIGH — non-home routes retain home social/description metadata

**Location:** live `/demo`, `/report-kit`, `/privacy`, `/terms`. After render,
titles and canonical URLs change, but all retain:

> Description: “Test GPU memory and save a clear report before you buy or resell.”
>
> OG title: “VRAM Field Test — Test GPU memory and save a report”

Physical route responses begin with the home head too; JavaScript changes only
the canonical link. Privacy and Terms are therefore described as a product
landing page to previews/crawlers.

**Fix:** emit physical route-specific title, description, canonical, OG, and
Twitter data for `/demo`, `/report-kit`, `/privacy`, `/terms`, and `404.html`.
Test each raw no-JavaScript response.

### F-1-4 — MEDIUM — visual-theme labels are carrying required reading copy

**Exact locations:** **“/ FIELD PROTOCOL 01 / SAFE, BOUNDED, LOCAL”**,
**“BENCH TAPE / NO. 01”**, **“A report you can hand over”**, **“See the result
before you install.”**, **“Run it in three bounded steps.”**, **“It tests
memory. It does not fix or certify hardware.”**, **“Install the field kit”**,
and the 404 h1 **“This page is not on the bench.”**

**Why:** these do not consistently name their section out of context; “tape,”
“bench,” “protocol,” and “bounded” ask the reader to decode the visual theme.

**Fix:** retain the distinctive cassette art but use **“Sample report”**,
**“How the memory test works”**, **“Memory test limits”**, **“Install VRAM
Field Test”**, and **“Page not found.”** Delete decorative labels that add no
instruction.

### F-1-5 — MEDIUM — first-screen technical jargon is unexplained

**Location:** **“Defaults to 90% detected coverage in windows.”**, **“TESTED:
11,520 MiB / 12,288 MiB”**, and **“PATTERNS: solid AA · solid 55 · address
XOR.”**

**Why:** “coverage in windows,” `MiB`, and “address XOR” do not help a person
assess a used GPU in 30 seconds.

**Fix:** write “Tests 90% of the memory your driver reports, in smaller safe
batches.” Label the sample “Memory tested” and place pattern names under a
Technical details disclosure with a plain explanation.

### F-1-6 — MINOR — README exceeds the 22-word limit

**Location:** Install section, 23 words:

> “Both installers read the release metadata, download the matching archive,
> verify its SHA-256 checksum, and place the binary on your path.”

**Fix:** “Each installer downloads the matching archive and checks its SHA-256
checksum. It then adds the binary to your path.”

## Copy audit

Counts include terse user-visible labels. Commands in fenced code blocks are
excluded as commands, not prose. **C** = unlisted material claim (F-1-2),
**J** = unexplained jargon (F-1-5), **H** = non-standalone heading/label
(F-1-4), **L** = more than 22 words (F-1-6). No landing button is a
non-result-naming verb.

### Landing

| Copy | Words | Flag / rewrite |
|---|---:|---|
| / FIELD PROTOCOL 01 / SAFE, BOUNDED, LOCAL | 6 | H,J — delete. |
| Test GPU memory before money changes hands. | 7 | — |
| For buyers, resellers, and repair benches who need a clear memory test record. | 13 | — |
| Try it with sample data | 5 | — |
| See a finished report and the exact test limits. | 9 | — |
| Runs locally. | 2 | C — test exact local scope or say tested CLI fact. |
| No account. | 2 | C — `no-account` test or remove. |
| Defaults to 90% detected coverage in windows. | 7 | J — “Tests 90% of reported memory in safe batches.” |
| Free core test. | 3 | C — unauthenticated-core-output test or remove. |
| $19 Report Kit. | 3 | C — tested price/entitlement or remove. |
| BENCH TAPE / NO. 01 | 4 | H — delete. |
| A report you can hand over | 6 | H — “Sample report”. |
| See the result before you install. | 6 | H — “Sample report”. |
| vram-fieldtest demo | 2 | — command. |
| ADAPTER: Example GPU 12 GB | 5 | — sample field. |
| TESTED: 11,520 MiB / 12,288 MiB | 4 | J — “Memory tested: 11.25 GB of 12 GB.” |
| PATTERNS: solid AA · solid 55 · address XOR | 7 | J — “Three memory checks completed.” |
| RESULT: PASS — 0 mismatches | 4 | — sample field. |
| REPORT: report.json + print-ready report.html | 5 | C — test output statement. |
| A pass documents this bounded run. | 6 | C,J — “A pass records this test only.” |
| It does not certify every GPU fault. | 7 | C — test limitation or remove. |
| Every run saves JSON for records and one page you can print. | 12 | C — real-run output test. |
| The report names the adapter, each pattern, mismatches, and coverage. | 10 | C — schema test. |
| Three bounded steps | 3 | H,J — “How the memory test works”. |
| Run it in three bounded steps. | 6 | H,J — “How the memory test works”. |
| Inspect | 1 | — |
| Find the adapter and the VRAM the driver exposes. | 9 | J — “See the card and memory your driver reports.” |
| Run | 1 | — |
| Confirm consent, choose a safe buffer size, then write and read back patterns. | 13 | J — “Confirm, choose an amount, then check memory.” |
| Keep | 1 | — |
| Save local JSON and a print-ready report with limits beside the result. | 13 | C — output/schema test. |
| Honest limits | 2 | H — “Memory test limits”. |
| It tests memory. It does not fix or certify hardware. | 10 | H — “Memory test limits”. |
| VRAM Field Test does not overclock, change drivers, or give repair advice. | 10 | C — test first two; remove advice promise. |
| Monitor cooling during every run. | 5 | — “Watch cooling while the test runs.” |
| Coverage stays visible when the driver cannot expose all VRAM. | 10 | C,J — unavailable-memory fixture. |
| Privacy | 1 | — |
| Reports stay in the folder you choose. | 7 | C — output-path test. |
| The CLI makes no network request. | 6 | — covered by `cli-local`. |
| The site stores a license token only when you add one. | 11 | C — clean-browser storage test. |
| Read the privacy policy | 4 | — |
| Install the field kit | 4 | H — “Install VRAM Field Test”. |
| Use one command. | 3 | H — “Install VRAM Field Test”. |
| Check the checksum. | 3 | H — “Verify the download”. |
| Windows and macOS packages are unsigned. | 6 | C — test signing state or move to platform docs. |
| Report Kit — $19 once | 4 | C — tested price/entitlement or remove. |
| One-time license. | 2 | C — test or remove. |
| Turn local report JSON into a printable cover and batch labels. | 11 | — `report-kit-output`. |
| The safety test and both report files stay free. | 9 | C — unauthenticated-core test. |
| Buy Report Kit / Open Report Kit / Have a license? / Paste your license token / Restore license | 3/3/3/4/2 | — labels. |

### README

| Copy | Words | Flag / rewrite |
|---|---:|---|
| Test GPU memory and save a clear report before you buy or resell. | 13 | C — core-output claim/test or scope to demo. |
| VRAM Field Test is for people who need repeatable evidence from a GPU memory-pattern run. | 15 | C,J — remove “repeatable evidence” or test it. |
| It uses a portable WebGPU compute buffer, reads it back, and saves local JSON plus a print-ready HTML report. | 19 | C,J — tested user result, not implementation promise. |
| It does not overclock hardware, change drivers, or certify every GPU fault. | 12 | C — test/remove. |
| The web demo is at vram-fieldtest.sociobot.in/demo. | 6 | — live route. |
| It shows bundled sample data and works offline after the first visit. | 12 | — `site-offline`/demo claims. |
| The CLI demo needs no GPU and no network. | 8 | — `demo-sample`. |
| It prints the temporary folder containing report.json and report.html. | 10 | — `demo-report`. |
| This is the exact sample used by the site demo. | 10 | C — fixture-equality test. |
| Both installers read the release metadata, download the matching archive, verify its SHA-256 checksum, and place the binary on your path. | 23 | L — split; retain tested facts. |
| Windows and macOS builds are unsigned. | 6 | C — test or platform docs. |
| On macOS, use right-click → Open if Gatekeeper blocks an unsigned binary. | 11 | — platform instruction. |
| The site and installers accept only the release version and source commit they were built from. | 16 | — `release-provenance`. |
| Each release includes PROVENANCE.json with that commit and the 96 GiB plan result. | 14 | — `release-provenance`. |
| The release job runs that command on the staged archive and again after downloading the published archive. | 17 | — `release-provenance`. |
| The winget manifest is ready under winget/ for owner submission. | 10 | C — test presence/status or remove. |
| --yes is explicit consent for a compute memory test. | 10 | — `safety-consent`. |
| By default, the tool plans 90% of detected VRAM and verifies that total in bounded allocator windows. | 17 | J — use “reported memory in batches”. |
| Use --mib to set a total coverage amount, or --window-mib to choose the largest allocator window (up to 16,384 MiB). | 21 | J — split and define batch. |
| The report records completed MiB, aggregate coverage, thermal samples, clock samples, and any unavailable local telemetry provider. | 17 | C,J — schema fixture or remove. |
| A time or thermal stop saves an incomplete report before exit. | 11 | C — timeout/thermal test. |
| A failed pattern exits with code 2. | 7 | C — controlled failure test. |
| Use --json for a machine-readable final summary. | 7 | C — JSON schema test. |
| The tool runs three patterns: solid AA, solid 55, and an address XOR value. | 13 | C,J — test or technical docs. |
| It allocates a WebGPU storage buffer, writes each pattern on the selected adapter, copies it back, then checks every word. | 20 | C,J — tested result, not implementation promise. |
| It keeps no telemetry; reports only write to the directory you select. | 12 | — network half is `cli-local`; add output-path test for rest. |
| npm run build:site produces the static site at dist/site with index.html at that root. | 14 | C — build-output test or contributor note. |
| npm run build also produces the release binary at target/release/vram-fieldtest. | 12 | C — build-output test or contributor note. |
| The site build writes physical files for /demo, /report-kit, /privacy, and /terms. | 12 | C — build-route test. |
| Unknown routes use 404.html with HTTP 404. | 7 | C — claim entry for route test. |
| A managed Static Web Apps function at /api/license/verify applies the license-check allowance before it calls Sociobot. | 18 | C,J — black-box test or remove implementation detail. |
| After deployment, npm run verify:live checks live routes, both viewport sizes, keyboard focus, accessibility, privacy, offline reload, console output, and the deployed release identity. | 20 | C — split into observable checks. |
| A manual run of the release workflow builds all platform packages without publishing them. | 12 | C — workflow assertion or maintainer note. |
| Only an exact v&lt;package version&gt; tag publishes a release. | 10 | — `release-provenance`. |
| The deterministic archive builder lets package-manager checksums be committed before that tag is created. | 14 | C,J — workflow assertion or remove. |
| MIT. | 1 | — licence label. |
| The site has privacy and terms pages. | 7 | — live routes. |
| The optional $19 Report Kit reads a local report and creates a printable cover and batch labels. | 17 | C for price; output is `report-kit-output`. |
| It never gates the core test or report export. | 9 | C — unlicensed export test. |
| The browser makes at most one background license check each 24 hours. | 12 | — `license-rate-limit`. |
| The site server allows eight checks per network address in a rolling ten-minute window. | 14 | — `unlock-allowance`. |
| The ninth check returns HTTP 429 with Retry-After; the browser waits until that time before another check. | 17 | — rate-limit claims. |

Use **GPU memory** for the user-facing concept and **test batch** for the
technical subdivision; define `MiB` only in technical documentation.

## Demo and sandbox verification

- Entered live `/demo` in one click. Its first screen already displayed a
  12 GB sample report (93.8% coverage, three patterns, zero mismatches).
- Confirmed persistent **“Demo — sample data, nothing is saved.”** banner,
  Reset demo, and Start for real.
- Seeded `demo:vram-fieldtest`, reset it, and confirmed it was cleared; no real
  license/storage data appeared in a fresh demo context. Source removes only
  the demo namespace while demo is active.
- The full live-demo Playwright request log contained only same-origin document,
  CSS, and JS requests; no console/page errors occurred.
- `cargo run --quiet -- demo --json` worked without GPU/network setup and
  returned `/tmp/vram-fieldtest-demo-5009`.

The demo itself passes. F-1-1 is about the landing-page mobile placement.

## Claims, structure, history

- From a clean `npm ci` checkout, every exact command in `.factory/claims.json`
  passed independently: all 13 IDs, including offline/privacy and release
  provenance. `npm test` passed 17 Node, 4 Rust, and 18 browser checks.
  `npm run build` produced `dist/site` and the release binary.
- HTTP checks returned 200 for `/`, `/demo`, `/report-kit`, `/privacy`,
  `/terms`, `/robots.txt`, `/sitemap.xml`, and `/favicon.svg`; an unknown route
  returned an actual styled HTTP 404. Header/footer, focus/back coverage, one
  rendered h1 per route, no console errors, and the product-specific
  cassette-zine visual system all passed.
- No earlier `.factory/review-*.md` or `.factory/polish-*.md` exists. I read
  all `verification-*.md` and the old handoff. Earlier high-VRAM/telemetry,
  lint, release provenance, 429 allowance, cache, and 404 findings are covered
  by current source/tests/live checks. This container still has no usable GPU,
  so a physical hardware run remains unverified as previously disclosed.
- No obvious missing AI, import/export, or sync capability was found. JSON/HTML
  export exists, Report Kit imports local JSON, and AI would be decorative.

## What would make this perfect

Expose the full sample-data CTA on the first 390 px screen; make every
visitor-facing promise observable or remove it; give physical routes accurate
static metadata; and replace theme labels/jargon with plain section names.
Then rerun this complete review from fresh contexts.
