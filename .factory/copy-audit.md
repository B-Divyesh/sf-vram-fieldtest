# Landing copy audit — repair 6

The first screen reads in one breath: “Test GPU memory before money changes hands. For buyers, resellers, and repair benches who need a clear memory test record. Try it with sample data.” It names the job, audience, and first action.

| Sentence or label | Words | Claim test / flag |
|---|---:|---|
| Test GPU memory before money changes hands. | 7 | — |
| For buyers, resellers, and repair benches who need a clear memory test record. | 13 | — |
| Try it with sample data | 5 | `demo-privacy` |
| See a finished report and the exact test limits. | 9 | — |
| Runs locally with no account. | 5 | `no-account` |
| Targets 90% of reported memory in test batches. | 8 | `high-vram-target` |
| Free core test. | 3 | `report-kit-price` |
| Report Kit costs $19 once. | 5 | `report-kit-price` |
| Sample report | 2 | — |
| Memory tested: 11.25 GB of 12 GB. | 7 | `sample-equality` |
| Three memory checks completed. | 5 | `demo-report` |
| A pass records this test only. | 6 | — |
| Each run writes a JSON record and a print-ready HTML report. | 11 | `demo-report` |
| The report lists the card, checks, mismatches, and memory tested. | 9 | `demo-report` |
| MiB is a memory unit. | 5 | — |
| An address-XOR check writes a changing value at each memory address. | 10 | — |
| These checks help find memory errors. | 6 | — |
| How the memory test works | 5 | — |
| See the card and memory your driver reports. | 9 | — |
| Confirm, choose an amount, then check memory. | 7 | — |
| Save a local JSON and print-ready report with the result and limits. | 12 | `demo-report` |
| Memory test limits | 3 | — |
| A hardware run needs a temperature reading from the selected card. | 11 | `selected-thermal-stop` |
| It stops at 85°C or if that reading disappears. | 9 | `selected-thermal-stop` |
| The unsafe override disables this automatic stop. | 7 | `selected-thermal-stop` |
| The test never changes clocks, voltages, or drivers. | 8 | `non-invasive` |
| Reports save to the folder you choose. | 7 | `report-output-path` |
| The CLI makes no network request. | 6 | `cli-local` |
| The site saves a license token only after you add one. | 11 | `license-storage` |
| Install VRAM Field Test | 4 | — |
| Windows and macOS packages are unsigned. | 6 | `unsigned-builds` |
| One license creates printable covers and batch labels from a local report. | 11 | `report-kit-output` |
| The core test and report files stay free. | 8 | `report-kit-price` |

No sentence exceeds 22 words. No banned word appears. The catalog description starts with “Test,” has 12 words, and is under 120 characters.

## Terminology

| Concept | One term used |
|---|---|
| Amount checked | memory tested |
| Allocator subdivision | test batch |
| Preloaded example | sample data |
| GPU result file | report |
| Optional paid add-on | Report Kit |
| Memory-writing check | memory check |
