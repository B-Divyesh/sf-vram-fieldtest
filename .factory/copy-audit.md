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
| Inspects VRAM exposed on the host where it runs. | 9 | `host-vram-inspection` |
| Free core test. | 3 | `report-kit-operator-gate` |
| Report Kit checkout is not available yet. | 7 | `report-kit-operator-gate` |
| Sample report | 2 | — |
| Each run writes a JSON record and a print-ready HTML report. | 11 | `demo-report` |
| The report lists the card, checks, mismatches, and memory tested. | 10 | `demo-report` |
| Coverage is calculated only from your completed run on the host where you run it. | 15 | `completed-run-coverage` |
| See the adapters and VRAM the host exposes. | 9 | `host-vram-inspection` |
| Confirm, choose an amount, then check memory. | 7 | — |
| Save a local JSON and print-ready report with the result and limits. | 12 | `demo-report` |
| A hardware run needs a temperature reading from the selected card. | 11 | `selected-thermal-stop` |
| It stops at 85°C or if that reading disappears. | 9 | `selected-thermal-stop` |
| Some local drivers do not provide that reading. | 8 | `selected-thermal-stop` |
| The default run then refuses to start. | 7 | `selected-thermal-stop` |
| The unsafe override disables this automatic stop. | 7 | `selected-thermal-stop` |
| The test never changes clocks, voltages, or drivers. | 8 | `non-invasive` |
| Reports save to the folder you choose. | 7 | `report-output-path` |
| The CLI makes no network request. | 6 | `cli-local` |
| The site saves a license token only after you add one. | 11 | `license-storage` |
| Windows and macOS packages are unsigned. | 6 | `unsigned-builds` |
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

The demo's 12 GB and 93.8% figures are illustrative fixture data. The product
does not claim a factory hardware matrix. `inspect` reads only the host where
it runs, and a coverage value comes only from a completed three-pattern report
on that host.
