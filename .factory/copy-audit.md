# Copy audit — 2026-08-30

The first screen reads in one breath: “Test GPU memory before money changes
hands. For buyers, resellers, and repair benches who need a clear memory test
record. Try it with sample data.” It says what the tool does, who it is for,
and what to do first.

| Sentence or label | Words | Claim test / flag |
|---|---:|---|
| Test GPU memory before money changes hands. | 7 | — |
| For buyers, resellers, and repair benches who need a clear memory test record. | 13 | — |
| Try it with sample data | 5 | `demo-privacy` |
| See a finished report and the exact test limits. | 9 | — |
| Runs locally with no account. | 5 | `no-account` |
| Detects and tests the GPU on the host where you run it. | 11 | `host-evidence-scope` |
| Free core test. | 3 | `report-kit-operator-gate` |
| Report Kit checkout is not available yet. | 7 | `report-kit-operator-gate` |
| Sample report | 2 | — |
| Each run writes a JSON record and a print-ready HTML report. | 11 | `demo-report` |
| The report lists the card, checks, mismatches, and memory tested. | 10 | `demo-report` |
| Coverage figures come from completed user-provided runs. | 7 | `host-evidence-scope` |
| See the adapters and VRAM exposed on your host. | 9 | `host-vram-inspection` |
| Confirm, choose an amount, then check memory. | 7 | — |
| Save a local JSON and print-ready report with the result and limits. | 12 | `demo-report` |
| Run inspect before a hardware test. | 6 | `safe-non-nvidia-default` |
| For every GPU vendor, it reports whether the automatic thermal stop is ready. | 13 | `safe-non-nvidia-default` |
| If temperature is unavailable, the default run stops before test-memory allocation. | 11 | `safe-non-nvidia-default` |
| The unsafe override disables this automatic stop. | 7 | `selected-thermal-stop` |
| When active, the guard stops at 85°C or if the reading disappears. | 12 | `selected-thermal-stop` |
| The test never changes clocks, voltages, or drivers. | 8 | `non-invasive` |
| Reports save to the folder you choose. | 7 | `report-output-path` |
| The CLI makes no network request. | 6 | `cli-local` |
| The site saves a license token only after you add one. | 11 | `license-storage` |
| Windows and macOS packages are unsigned. | 6 | `unsigned-builds` |
| SHA-256 checks verify bytes, not publisher identity. | 7 | `unsigned-builds` |
| Report Kit turns a local report into printable covers and batch labels. | 11 | `report-kit-output` |
| Checkout is unavailable until an operator configures its Sociobot product mapping. | 11 | `report-kit-operator-gate` |
| The core test and report files stay free. | 8 | `report-kit-operator-gate` |

No landing-page sentence exceeds 22 words. No banned word appears. The catalog
description starts with “Test,” has 12 words, and is under 120 characters.

## Terminology

| Concept | One term used |
|---|---|
| Amount checked | memory tested |
| Allocator subdivision | test batch |
| Preloaded example | sample data |
| GPU result file | report |
| Optional paid add-on | Report Kit |
| Memory-writing check | memory pattern |
| Host-visible adapter list | inspect |
| Result percentage | coverage value |

## Scope check

The demo's 12 GB and 93.8% figures are illustrative fixture data. The CLI
detects and tests the GPU on the user host. Coverage figures come from
completed user-provided runs. Release packages include no factory GPU-lab
results. Windows and macOS packages are plainly labelled as unsigned.
