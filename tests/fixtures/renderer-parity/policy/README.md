# Original source references

These captures are retained for model provenance and physical comparison with
the TSX-authored repros, not as inputs to post-render Circuit JSON mutation.

| File | Source |
| --- | --- |
| `TO-92_Inline.step` | `tscircuit/circuit-json-to-gltf` commit `986b609b54b8c79859d5e900a1f181b98dc7573e`, `tests/assets/TO-92_Inline.step` |
| `to92.circuit.json` | Original exporter TO-92 repro compiled without an explicit model origin |
| `flashlight.circuit.json` | Original `tests/assets/usb-c-flashlight.json` from that exporter commit |
| `flashlight-usb.obj` | The original C165948 model URL recorded in the flashlight input |

New renderer inputs come from `../circuits/*.circuit.tsx`.
The source models are copied locally during preparation. The native STEP
story still uses the production viewer's existing OCCT CDN runtime.
