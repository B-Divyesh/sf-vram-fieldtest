# Demo sandbox

- Web URL: `https://vram-fieldtest.sociobot.in/demo` or `https://vram-fieldtest.sociobot.in/?demo=1`. The landing action opens the query URL in one click. It shows an isolated Example GPU 12 GB fixture. Its VRAM and coverage values are illustrative, not a result from any host. The browser demo does not read or write real records. Its reserved namespace is `demo:vram-fieldtest`; Reset demo discards and recreates the sample marker, and Start for real discards it. The route is cached after the first visit for an offline reload.
- CLI command: `vram-fieldtest demo` or `cargo run -- demo --json`. It copies the bundled `examples/sample-report.json` into a process-specific temporary directory and creates `report.json` plus `report.html` there.
- The CLI demo makes no network request. The browser demo requests only same-origin static files. It is safe for a verifier to run from a clean checkout.
- The real `vram-fieldtest inspect` command detects adapters and VRAM values on the host where a user runs it. It tests that host only. Coverage figures come from completed user-provided runs.
- `inspect` also reports whether the default thermal stop is ready for each adapter. A missing reading blocks the default run before test-memory allocation, including for non-NVIDIA adapters.
