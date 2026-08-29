# VRAM Field Test repair — ready for deployment

Repaired verifier candidate `99a70a94e075848ab3b33491a7bb287d095afec3` from report
[`verification-1.md`](verification-1.md). Repair source commit:
`aed596f0554ec63b8d47bd5eae5bda26083c51e5`.

## Fixed release blockers

- The CLI no longer caps a complete run at 16,384 MiB. `run` now defaults to
  90% of detected VRAM and covers that amount across bounded allocator
  windows. `plan --detected-mib 98304 --coverage 90 --window-mib 16384`
  returns 88,474 MiB (90.0004%) in six windows. The report records completed,
  aggregate coverage rather than assuming a full card allocation.
- Each pattern is divided into 64 MiB GPU chunks. Deadline checks occur before
  each chunk, while waiting for read-back, and during CPU comparison. A time or
  thermal stop writes an `incomplete` JSON and HTML report before returning an
  error.
- Reports now contain local thermal and core/memory clock samples. NVIDIA,
  AMD, and Intel local providers are attempted (`nvidia-smi`, `rocm-smi`, and
  Intel DRM sysfs); unavailable readings are recorded honestly.
- `cargo clippy --locked -- -D warnings` is clean and is required by CI and the
  release workflow.
- The Report Kit browser client makes at most one background verification check
  per 24 hours. It stores and honors an exposed `Retry-After` after HTTP 429,
  makes no retry before that time, and states the behavior on Privacy and Terms.
- Production HTML now references content-hashed `assets/app.*.js` and
  `assets/styles.*.css`. The existing `/assets/*` immutable-cache route applies
  to both, and the service worker is generated with those same hashes.

## Verification evidence

Performed from a clean Node install on 2026-08-29 UTC:

```sh
npm ci && npm test && npm run build && cargo fmt --check \
  && cargo clippy --locked -- -D warnings && cargo package --locked --allow-dirty
```

Result: `npm ci` installed 5 packages with zero vulnerabilities; 10 Node
integration tests, 4 Rust unit tests, and 14 Playwright desktop/mobile tests
passed. The browser suite includes axe on `/`, `/demo`, `/report-kit`,
`/privacy`, `/terms`, and the 404 route; keyboard routing, 390 px layout,
offline reload, request privacy, and no console-error release fallback passed.
`cargo package` packaged and verified `vram-fieldtest-0.1.1`.

Every command in `.factory/claims.json` is backed by a tagged sandbox test.
New exact regressions cover a modeled 96 GiB adapter reaching 90% in six
windows, content-hashed immutable assets, and a 429 response with
`Retry-After` preventing a second license request.

Local production-bundle smoke test using `/opt/fleet/lib/verify-url.sh`:

```json
{"loadMs":699,"errors":[],"a11y":{"title":"VRAM Field Test — Test GPU memory","lang":"en","h1":1,"main":true,"imgsMissingAlt":0,"buttonsUnlabeled":0,"textLength":2242}}
```

Built sizes: JavaScript 5,980 bytes gzip, CSS 2,431 bytes gzip, and hero WebP
120,554 bytes. The output is `dist/site/`; release binary is
`target/release/vram-fieldtest`.

## Known hardware limit

This worker has no usable GPU adapter, so it could not truthfully execute a
physical 90%-of-96-GiB pass. The deterministic high-VRAM plan and report
aggregation are covered in tests; run the documented 96 GiB command on the
target hardware before claiming a hardware matrix result. The CLI still fails
safely with its driver recovery message when no adapter is present.

## Deployment

The product remains a `cli-installers` artifact with the static site deployed
from `dist/site`. Main is pushed after this handoff commit; the linked Static
Web Apps deployment should consume the updated hashed bundle. Verify the live
site after the deployment completes with the same URL smoke test and confirm
`/assets/*` sends `Cache-Control: public, max-age=31536000, immutable`.
