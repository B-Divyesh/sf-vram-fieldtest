# VRAM Field Test

Test GPU memory and save a clear report before you buy or resell.

VRAM Field Test is for people who need repeatable evidence from a GPU memory-pattern run. It uses a portable WebGPU compute buffer, reads it back, and saves local JSON plus a print-ready HTML report. It does not overclock hardware, change drivers, or certify every GPU fault.

## Try the sample

The web demo is at [vram-fieldtest.sociobot.in/demo](https://vram-fieldtest.sociobot.in/demo). It shows bundled sample data.

The CLI demo needs no GPU and no network:

```sh
cargo run -- demo
```

It prints the temporary folder containing `report.json` and `report.html`. This is the exact sample used by the site demo.

## Install

After a release is published:

```sh
curl -fsSL https://vram-fieldtest.sociobot.in/install.sh | sh
```

On PowerShell:

```powershell
irm https://vram-fieldtest.sociobot.in/install.ps1 | iex
```

Both installers read the release manifest, download the matching archive, verify its SHA-256 checksum, and place the binary on your path. Windows and macOS builds are unsigned. On macOS, use right-click → Open if Gatekeeper blocks an unsigned binary.

Homebrew is prepared as `brew install B-Divyesh/vram-fieldtest/vram-fieldtest` once the tap is published. Scoop and winget manifests are in this repository for release checksum updates and submission.

## Run a test

First inspect the adapter:

```sh
vram-fieldtest inspect
```

Run only with working cooling and a clear view of the machine:

```sh
vram-fieldtest run --yes --mib 512 --output ./gpu-record
```

`--yes` is explicit consent for a compute memory test. `--mib` is bounded to 16,384 MiB in v0.1; start at 256 MiB. The result records actual tested MiB and, when the OS exposes it, detected VRAM and coverage. A failed pattern exits with code 2. Use `--json` for a machine-readable final summary.

The tool runs three patterns: solid `AA`, solid `55`, and a walking address value. It allocates a WebGPU storage buffer, writes each pattern on the selected adapter, copies it back, then checks every word. It keeps no telemetry; reports only write to the directory you select.

## Develop and verify

Requirements: current Rust stable and Node 20+.

```sh
npm test
npm run build
```

`npm run build:site` produces the static site at `dist/site` with `index.html` at that root. `npm run build` also produces the release binary at `target/release/vram-fieldtest`.

Claim checks can run one at a time:

```sh
npm test -- --grep @claim:demo-report
```

## License and privacy

MIT. See [LICENSE](LICENSE). The site has [privacy](https://vram-fieldtest.sociobot.in/privacy) and [terms](https://vram-fieldtest.sociobot.in/terms) pages. The optional $19 Report Kit is a one-time Sociobot license; it never gates the core test or report export.
