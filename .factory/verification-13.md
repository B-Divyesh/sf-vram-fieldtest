# Verify GPU memory before purchase — verification 13

**Verdict: FAIL.**

- Implementation reviewed: `2691b14210e2c5b081d8193e34ca99fe559a9c21` (`v0.1.11`)
- Documentation reviewed: `abe9d9a919ca618362ece5daa0d675c55b7e5338`
- Live URL: <https://vram-fieldtest.sociobot.in>
- Declared claims tested: 32 of 32 passed
- Untested public claims: 0
- Findings: 4 (2 high, 1 medium, 1 low)

The job is to test GPU memory and save a local report before purchase or resale.
The audience is buyers, resellers, and repair benches. The first action is
**Try it with sample data**.

## Findings

### F13-1 — High — required physical Windows and Linux evidence is absent

The researched success measure requires completed, reproducible Windows and
Linux GPU runs with at least 90% of detected VRAM, all three patterns, retained
allocation evidence, and selected-adapter thermal data. The public `v0.1.11`
`PROVENANCE.json` instead says `evidence_kind: package-release` and explicitly
says that it contains no factory GPU-lab results. The release asset list has no
Windows or Linux completed-report evidence. This verifier has no usable GPU:
the installed artifact returned `[]` for `inspect --json`.

The 12,288 MiB and 98,304 MiB `plan` results are correct previews, not physical
test results. Publish independently reviewable completed reports from physical
Windows and Linux hosts before accepting the brief's success measure.

### F13-2 — High — safe real testing is not cross-vendor on the promised platforms

The safe default requires selected-card temperature data, which is the correct
guard. The current implementation and public limits state that automatic data
comes from NVIDIA SMI or Linux DRM hwmon. Other Windows and macOS cards can
inspect, plan, and demo, but their default memory run is blocked. The unsafe
override removes the automatic thermal guard and cannot satisfy the brief's
safe Vulkan, Metal, and DirectX protocol requirement.

Add safe Windows AMD/Intel and macOS temperature providers, then verify those
real paths on physical hardware; or narrow the supported real-test platforms.

### F13-3 — Medium — the one-time Report Kit purchase path is unavailable

The landing and Report Kit pages accurately show that checkout is unavailable
until an operator configures the Sociobot product mapping, and no broken buy
link is exposed. However, a new customer cannot complete the researched
one-time purchase. License restore is not a substitute for checkout.

Register the product mapping and verify the hosted Sociobot checkout, return
token storage, and background verification before claiming this paid path is
end to end.

### F13-4 — Low — the mobile header hides its Privacy link

At a fresh 390 by 844 phone viewport, the header shows Demo, Install, and
Report Kit but hides Privacy with `.mast nav a:last-child{display:none}`. The
footer Privacy link and direct `/privacy` route work, so privacy information is
not unavailable. This nevertheless breaks the required consistent header
structure, which includes Privacy on every route.

Keep Privacy in the mobile header, or provide an equally visible labelled menu
control that includes it.

## What passed

### First screen and demo

Fresh desktop and phone browsers showed the job, audience, and first action
before scrolling. At 390 by 844, the sample action was 252.7 by 49.5 CSS px at
y=522 and fully visible; horizontal width was 390 of 390.

One click opened a populated Example GPU 12 GB report with 11,520 MiB of
12,288 MiB, 93.8% illustrative coverage, three patterns, and zero mismatches.
The persistent banner said “Demo — sample data, nothing is saved.” Reset
recreated only `demo:vram-fieldtest`; a seeded real-data sentinel was unchanged.
Start for real removed the demo key and preserved the sentinel.

### Claims and clean checkouts

From a clean clone at the implementation SHA, `npm ci --no-audit --no-fund`
completed and every exact command listed in `.factory/claims.json` passed
individually. This is 32 of 32 claims, including package-manager archives,
Mac architecture selection, report-only SHA handling, offline reload, privacy,
and installer checksums.

The implementation checkout also passed `npm test`, `npm run lint`, `npm run
build`, `cargo test --locked --all-targets` (14 passed), `cargo check --locked
--all-targets`, and `cargo package --locked` (88 packaged files). The build
created `dist/site` and the release binary.

The later documentation checkout also passed `npm test`: 34 Node tests passed,
one Windows-only fixture was skipped, 14 Rust tests passed, and 29 Playwright
tests passed. This confirms the earlier report-only SHA gate failure is closed.

### Live site, accessibility, privacy, and routes

`npm run verify:live -- https://vram-fieldtest.sociobot.in` passed from the
documentation checkout. `/`, `/demo`, `/report-kit`, `/privacy`, and `/terms`
returned 200. The deliberate missing route returned a styled 404 with a return
link. All checked routes had one h1, one main landmark, `lang=en`, route titles,
no console or page errors, and zero Axe serious or critical issues.

The worker URL check passed with title, language, main, image alt coverage,
and labelled controls. Keyboard skip-to-content, route focus and back,
disclosure controls, 200% text, 44 px controls, reduced motion, offline demo
reload, and route metadata all passed. A direct fresh `/demo` session made only
same-origin requests. No third-party script, font, analytics, or sample upload
was observed. Internal links worked; the self-link on the deliberate 404
returns its intentional 404 page and is not a broken page.

The live landing uses the cassette-era zine system documented in
`.factory/design.md`; desktop and phone screenshots were visually inspected.
The fingerprinted hero returned `Cache-Control: public, max-age=31536000,
immutable` and was 120,554 bytes.

### Release consumer and recovery paths

The live shell installer verified the published Linux archive SHA-256 and
installed `vram-fieldtest 0.1.11` in a new consumer directory. The installed
binary passed `--version`, `--help`, and a proxy-blocked `demo --json`; the demo
wrote non-empty local JSON and HTML with three passing patterns and retained
allocations. `inspect --json` returned the host's empty inventory.

Normal previews produced 11,060 MiB for 12,288 MiB and 88,474 MiB for 98,304
MiB. Invalid 101% coverage exited 2 with the accepted range. A real run without
`--yes` exited 1 with a consent recovery message. A consented run without an
adapter exited 1 with the `inspect` recovery instruction.

### License endpoint and state boundary

Nine invalid verification requests from one test address returned eight 200
responses followed by 429 with `Retry-After: 599`. This matches the declared
eight requests per ten minutes allowance. The static product has no tenant or
report server state: reports stay local and the allowance bucket is process
local. Therefore tenant isolation, SQLite persistence, restart persistence, and
a health route are not applicable backend checks here.

## Earlier finding disposition

| Earlier issue | Current disposition |
| --- | --- |
| First-screen mobile action, plain words, decorative headings, and route metadata | Closed; fresh desktop/phone and raw-route checks passed. |
| Unlisted public claims | Closed; 32 registered commands each passed independently. |
| Reused allocations, missing reported-memory fallback, invalid 7,200-second workflow command, selected-adapter telemetry, lint | Closed by retained Rust and release tests. |
| Demo reading real storage, touch/focus issues, malformed Report Kit input, offline reload, HTTP-200 missing page | Closed by browser and live checks. |
| Candidate/release identity and later report-only SHA handling | Closed; live source is `2691b14` and site commit is `abe9d9a`; both implementation and documentation tests passed. |
| Mac architecture, Homebrew/Scoop/winget claims, stale tap guidance, immutable hero cache | Closed by release claims and live immutable hero header. |
| Physical Windows/Linux evidence | Open as F13-1. |
| Safe cross-vendor thermal providers | Open as F13-2. |
| Sociobot billing registration | Open as F13-3. |
| Unsigned Windows/macOS packages | Disclosed and permitted by the installer contract; checksum wording does not claim code signing. |

## Evidence

- `/work/.evidence/verification-13-claims.log`
- `/work/.evidence/verification-13-quality.log`
- `/work/.evidence/verification-13-live-verify.log`
- `/work/.evidence/verification-13-demo-flow.json`
- `/work/.evidence/verification-13-consumer.log`
- `/work/.evidence/verification-13-rate-limit.log`
- `/work/.evidence/verification-13-verify-url.log`

No product code was modified in this verification.
