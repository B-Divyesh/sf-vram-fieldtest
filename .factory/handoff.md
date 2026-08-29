# Polish 1 handoff — VRAM Field Test

## Result

Repair commit: `22f66b147e4755f7f3c43d748fdd9e7ae07fcc67`.

This closes every finding in `.factory/review-1.md`. The repair preserves the cassette-era zine visual system while making the first mobile screen actionable, turning the demo into a direct `?demo=1` sandbox, and giving every retained visitor-reliant claim an exact automated check.

## What changed

- The first 390 × 844 screen shows the complete sample CTA before the decorative image. Screenshot: `artifacts/polish-1-mobile-390x844.png`.
- The landing CTA opens `/?demo=1`. Demo mode uses only `demo:vram-fieldtest`; Reset demo recreates sample-only state and Start for real clears it.
- Static route heads now differ for landing, Demo, Report Kit, Privacy, Terms, and 404 before JavaScript runs. Route transitions update focus, title, canonical, social metadata, and the polite route announcement.
- Rewrote non-standalone themed labels and unexplained first-screen jargon. Moved technical pattern names behind Technical details.
- Added the claims registry, route metadata, demo sandbox, output-directory, pricing/free-core, unsigned-package, non-invasive, mobile, and storage proofs. See `.factory/polish-1.md`.
- Rewrote README install copy and added the verb-first catalog description.

## Exact verification evidence

From a fresh local clone at `/tmp/vram-fieldtest-clean-h7g7zj`:

```sh
npm ci
npm test
npm run lint
npm run build
```

All passed: 21 Node checks, 5 Rust tests, and 23 Playwright tests. The build produced `dist/site` and `target/release/vram-fieldtest`.

Every one of the 22 exact commands listed in `.factory/claims.json` then passed independently from that clone. Their command logs are `/tmp/vram-clean-claim-*.log` in this worker container.

Other evidence:

- `@claim:mobile-first-action` asserts the complete primary target is inside a fresh 390 × 844 viewport.
- `@claim:demo-privacy` enters `/?demo=1`, records only same-origin requests, checks the demo namespace, and exercises Reset demo.
- `@claim:route-metadata` requests all built physical routes without JavaScript and checks title, description, OG, and Twitter data.
- Axe runs report no serious or critical issues on `/`, `/demo`, `/report-kit`, `/privacy`, `/terms`, and the actual 404.
- Screenshot captures: `artifacts/polish-1-mobile-390x844.png` and `artifacts/polish-1-demo.png`.

## Deploy

Work order configuration: static deploy, `npm ci && npm run build:site`, publish `dist/site`. Push `main` at the repair commit to deploy.

The site intentionally continues to identify the already-published CLI release `v0.1.3` and its tagged source commit in `release.json`. This static-site repair does not alter the shipped binary or fabricate a new installer release.

## Known limitation

No usable physical GPU is exposed in this worker. The clean-clone suite verifies planning, consent, local report creation, no-adapter recovery, and all browser paths. A physical GPU pattern run remains the only hardware-dependent check.
