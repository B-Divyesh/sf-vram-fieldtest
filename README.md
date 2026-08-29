# VRAM Field Test

Test GPU memory and save a clear report before you buy or resell.

VRAM Field Test is for people who need repeatable evidence from a GPU memory-pattern run. It uses a portable WebGPU compute buffer, reads it back, and saves local JSON plus a print-ready HTML report. It does not overclock hardware, change drivers, or certify every GPU fault.

## Try the sample

The web demo is at [vram-fieldtest.sociobot.in/demo](https://vram-fieldtest.sociobot.in/demo). It shows bundled sample data and works offline after the first visit.

The CLI demo needs no GPU and no network:

```sh
cargo run -- demo
```

It prints the temporary folder containing `report.json` and `report.html`. This is the exact sample used by the site demo.

## Install

On Linux or macOS:

```sh
curl -fsSL https://vram-fieldtest.sociobot.in/install.sh | sh
```

On PowerShell:

```powershell
irm https://vram-fieldtest.sociobot.in/install.ps1 | iex
```

Both installers read the release metadata, download the matching archive, verify its SHA-256 checksum, and place the binary on your path. Windows and macOS builds are unsigned. On macOS, use right-click → Open if Gatekeeper blocks an unsigned binary.

The site and installers accept only the release version and source commit they were built from. Each release includes `PROVENANCE.json` with that commit and the 96 GiB `plan` result. The release job runs that command on the staged archive and again after downloading the published archive.

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

First inspect the adapter:

```sh
vram-fieldtest inspect
```

Run only with working cooling and a clear view of the machine:

```sh
vram-fieldtest run --yes --mib 512 --output ./gpu-record
```

`--yes` is explicit consent for a compute memory test. By default, the tool plans 90% of detected VRAM and verifies that total in bounded allocator windows. Use `--mib` to set a total coverage amount, or `--window-mib` to choose the largest allocator window (up to 16,384 MiB). The report records completed MiB, aggregate coverage, thermal samples, clock samples, and any unavailable local telemetry provider. A time or thermal stop saves an incomplete report before exit. A failed pattern exits with code 2. Use `--json` for a machine-readable final summary.

Plan a high-VRAM run without opening the GPU:

```sh
vram-fieldtest plan --detected-mib 98304 --coverage 90 --window-mib 16384 --json
```

The tool runs three patterns: solid `AA`, solid `55`, and an address XOR value. It allocates a WebGPU storage buffer, writes each pattern on the selected adapter, copies it back, then checks every word. It keeps no telemetry; reports only write to the directory you select.

## Develop and verify

Requirements: current Rust stable and Node 20+.

```sh
npm test
npm run build
```

`npm run build:site` produces the static site at `dist/site` with `index.html` at that root. `npm run build` also produces the release binary at `target/release/vram-fieldtest`.

The site build writes physical files for `/demo`, `/report-kit`, `/privacy`, and `/terms`. Unknown routes use `404.html` with HTTP 404. A managed Static Web Apps function at `/api/license/verify` applies the license-check allowance before it calls Sociobot.

The clean-clone gate uses npm 10.9.8:

```sh
npm ci && npm test && npm run build
npm run lint
```

After deployment, `npm run verify:live -- https://vram-fieldtest.sociobot.in`
checks live routes, both viewport sizes, keyboard focus, accessibility, privacy,
offline reload, console output, and the deployed release identity.

Claim checks can run one at a time:

```sh
npm test -- --grep @claim:demo-report
```

A manual run of the release workflow builds all platform packages without publishing them. Only an exact `v<package version>` tag publishes a release. The deterministic archive builder lets package-manager checksums be committed before that tag is created.

## License and privacy

MIT. See [LICENSE](LICENSE). The site has [privacy](https://vram-fieldtest.sociobot.in/privacy) and [terms](https://vram-fieldtest.sociobot.in/terms) pages. The optional $19 Report Kit reads a local report and creates a printable cover and batch labels. It never gates the core test or report export. The browser makes at most one background license check each 24 hours. The site server allows eight checks per network address in a rolling ten-minute window. The ninth check returns HTTP 429 with `Retry-After`; the browser waits until that time before another check.
