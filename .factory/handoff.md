# VRAM Field Test — independent QA handoff

## **FAIL — release blocked**

Independent verification of candidate
`7cf53e1269aa16d73ec5550932f2a57bcab6b712` against
<https://vram-fieldtest.sociobot.in> completed on 2026-08-29 UTC.

The static site is deployed from this candidate and its quality gates pass, but
the release must not ship:

1. **P0:** the live installer downloads GitHub release `v0.1.1`, an older CLI
   which does not recognise the candidate's `plan` command and therefore cannot
   deliver the 90%-of-96-GiB coverage protocol claimed by the current landing
   page.
2. **P1:** 20 direct invalid license-verification requests from one client all
   returned HTTP 200; no documented server-side allowance, HTTP 429, or
   `Retry-After` was observed.
3. **P2:** live unknown routes return HTTP 200 rather than a real HTTP 404.

Publish installers built from the candidate, enforce and document a server-side
unlock-request allowance, and fix the deployed 404 response before re-verifying.

Detailed commands, evidence, passed claims, live asset hashes, browser checks,
and the hardware limitation are in
[`verification-2.md`](verification-2.md).

## How to reproduce passing local checks

```sh
npm ci
npm test
npm run build
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo package --locked --allow-dirty
```

Run the bundled safe sample with `cargo run -- demo --json`. A real test needs
an available GPU and explicit `--yes`; this verifier environment had no usable
adapter.
