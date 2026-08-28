# Demo sandbox

- Web URL: `https://vram-fieldtest.sociobot.in/demo` (or `/?demo=1`). It shows an isolated sample report for an Example GPU 12 GB. The browser demo does not read or write real records. Its reserved namespace is `demo:vram-fieldtest`; Reset demo clears that key. The route is cached after the first visit for an offline reload.
- CLI command: `vram-fieldtest demo` or `cargo run -- demo --json`. It copies the bundled `examples/sample-report.json` into a process-specific temporary directory and creates `report.json` plus `report.html` there.
- The CLI demo makes no network request. The browser demo requests only same-origin static files. It is safe for a verifier to run from a clean checkout.
