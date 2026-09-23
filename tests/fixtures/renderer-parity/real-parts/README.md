# Real-part footprint references

`to92-footprint.tsx` describes the original KiCad `TO-92_Inline_Narrow` model
in `../policy/TO-92_Inline.step`, without editing its source orientation.
The STEP came from `tscircuit/circuit-json-to-gltf` commit
`986b609b54b8c79859d5e900a1f181b98dc7573e`, `tests/assets/TO-92_Inline.step`.
Its SHA-256 is
`f0b61c32ecbf0067157adc5a3d4966ceadf5d6dafe93c51af35f76c41c71a54a`.

Native lead centers are `(0, 0)`, `(1.27, 0)` and `(2.54, 0)` mm. Each lead
is 0.48 by 0.38 mm, extending from Z=-2.5 to Z=2.5. The footprint uses
0.75 mm holes and 1.05 by 1.5 mm pads. The molded body lies above Z=2.5;
its asymmetric bounding box is not the correct contact datum.

The rotated OBJ variants, native OBJ capture, and generation scripts were
removed. They manufactured the source-orientation problem rather than
demonstrating an existing part's behavior.

`flashlight-parts.tsx` preserves the real TYPE-C-31-M-12 / JLCPCB C165948
connector footprint: 16 SMT contacts, four plated slots and two locating holes.
Its original OBJ is retained in `../policy/flashlight-usb.obj`; the TSX origin
repro does not edit the model or infer an explicit replacement datum.
