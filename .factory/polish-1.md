# Polish 1 — review finding closure

Candidate repaired from `4e52a7ab293b9306bbff5233a43480044b55f00a` using review commit `1a32f39600d6c99610cbe314d828a7df5ca46d91`.

| Finding | Change made | Evidence |
|---|---|---|
| F-1-1 | The 390 px layout now keeps the copy, sample action, and facts before the bench image. The primary action links directly to `/?demo=1`. | `@claim:mobile-first-action`; `artifacts/polish-1-mobile-390x844.png`; live CTA box `{y:521.97,height:49.5}` inside 390 × 844 at `https://vram-fieldtest.sociobot.in/`. |
| F-1-2 | Added `.factory/claims.json` entries and isolated checks for account-free use, output directory, non-invasive operation, unsigned packages, report price/free core, demo equality, demo storage, mobile first action, and route metadata. Narrowed removed promises where no useful observable proof exists. | All 22 exact claims commands passed in a fresh clone; logs `/tmp/vram-clean-claim-*.log`. |
| F-1-3 | The static builder now emits distinct title, description, canonical, Open Graph, and Twitter values for each physical route and 404. The dev verifier serves that built output. | `@claim:route-metadata`; live title checks passed for `/`, `/demo`, `/report-kit`, `/privacy`, `/terms`, and the actual 404. |
| F-1-4 | Replaced decorative required labels with Sample report, How the memory test works, Memory test limits, Install VRAM Field Test, and Page not found. The cassette-zine visual system remains intact. | `site/tests/quality.spec.mjs` route/a11y checks; `@claim:route-metadata`; screenshot evidence. |
| F-1-5 | Rewrote first-screen jargon as reported memory in safe batches and memory tested. Pattern names moved into a Technical details disclosure with plain definitions. | `@claim:high-vram-coverage`, `@claim:demo-report`, and `.factory/copy-audit.md`. |
| F-1-6 | Split the installer sentence in README and rewrote the README in plain language. | `.factory/copy-audit.md`; README review. |

The review records no earlier `review-*` or `polish-*` files. All current findings are closed by this document and the tests named above.
