# VRAM Field Test

Test GPU memory before money changes hands.

VRAM Field Test is for buyers, resellers, and repair benches. It creates a local record of a GPU memory test.

## Try the sample

Open the [web demo](https://vram-fieldtest.sociobot.in/demo). It shows bundled sample data and works offline after the first visit.

The CLI demo needs no GPU or network connection:

```sh
cargo run -- demo
```

It prints a temporary folder with `report.json` and `report.html`. The web and CLI demos use the same bundled sample.

## Install

On Linux or macOS:

```sh
curl -fsSL https://vram-fieldtest.sociobot.in/install.sh | sh
```

On PowerShell:

```powershell
irm https://vram-fieldtest.sociobot.in/install.ps1 | iex
```

Each installer downloads the matching archive and checks its SHA-256 checksum. It then adds the binary to your path.

Windows and macOS builds are unsigned. On macOS, use right-click → Open if Gatekeeper blocks an unsigned binary.

Homebrew:

```sh
brew install B-Divyesh/vram-fieldtest/vram-fieldtest
```

Scoop:

```powershell
scoop bucket add vram-fieldtest https://github.com/B-Divyesh/sf-vram-fieldtest
scoop install vram-fieldtest/vram-fieldtest
```

The winget manifest is ready under `winget/` for owner submission.

## Run a test

Inspect the card and memory your driver reports:

```sh
vram-fieldtest inspect
```

`inspect` lists every available adapter with an index. Windows totals come from DXGI.

Linux uses the driver memory total or `nvidia-smi`.

macOS uses Metal's recommended working-set size for each available device.

Run only with working cooling and a clear view of the machine:

```sh
vram-fieldtest run --yes --adapter 0 --output ./gpu-record
```

`--yes` confirms that you want to start a compute memory test. By default, the tool targets 90% of reported memory in test batches.

A hardware run starts only when it can read the selected card's temperature. It stops at 85°C or when that reading disappears.

`--allow-no-thermal-stop` is an unsafe override. It disables the automatic thermal stop and requires manual monitoring.

The test keeps every counted allocation live until all three patterns finish. The driver cannot recycle one small allocation as claimed coverage.

If the driver does not report a total, the test stops with an instruction. It never substitutes a small default. After checking the card, use `--mib` to set an explicit amount.

Use `--adapter` to choose a listed card. Use `--window-mib` to set the largest monitored batch, up to 16,384 MiB.

The report records completed memory, retained allocation evidence, each check, and selected-card temperature readings.

A time or thermal stop saves an incomplete report before exit.

A failed memory check exits with code 2. Use `--json` for a machine-readable final summary.

Plan a high-memory test without opening the GPU:

```sh
vram-fieldtest plan --detected-mib 98304 --coverage 90 --window-mib 16384 --json
```

The tool runs three memory checks. Technical names and definitions are available in the site’s Technical details section.

The CLI makes no network request. It writes reports only to the folder you select.

Release checks run a 4 MiB software-renderer smoke test on Windows and Linux. Their JSON records ship with each GitHub release.

## Develop and verify

Requirements: current Rust stable and Node 20+.

```sh
npm ci
npm test
npm run build
npm run lint
```

`npm run build:site` writes the deployable site to `dist/site`. `npm run build` also writes the release binary to `target/release/vram-fieldtest`.

The site has physical pages for `/demo`, `/report-kit`, `/privacy`, and `/terms`. Unknown routes return the styled 404 page.

Run a single claim check with:

```sh
npm test -- --grep @claim:demo-report
```

After deployment:

```sh
npm run verify:live -- https://vram-fieldtest.sociobot.in
```

## License and privacy

MIT. See [LICENSE](LICENSE). Read the site [privacy](https://vram-fieldtest.sociobot.in/privacy) and [terms](https://vram-fieldtest.sociobot.in/terms).

Report Kit costs $19 once. It turns a local report into a printable cover and three batch labels. The core test and report files stay free.
