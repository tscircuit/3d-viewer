# Physically interpretable renderer repros

Every reviewer-facing case starts with a short TSX file in `circuits/`.
`compileRendererCircuit` runs that component through the pinned `tscircuit`
authoring runtime once. Its unmodified Circuit JSON is passed to both the
production viewer and the development-only published exporter.

There are no post-render changes to CAD rotations, positions, origins, pads,
holes, or board geometry. The TSX is displayed beside the comparison output.

| Source | Physical criterion | Reference result with exporter 0.0.130 |
| --- | --- | --- |
| `to92-x.circuit.tsx` | Upright transistor, all three leads through holes after +90 degrees X | Viewer seats the real part; exporter inverts it |
| `to92-y.circuit.tsx` | Same mounting after +90 degrees Y | Viewer seats the real part; exporter inverts it |
| `to92-xy.circuit.tsx` | Same mounting after composing +90 degrees X and Y | Viewer seats the real part; exporter leaves it sideways |
| `to92-origin.circuit.tsx` | All three leads centered in holes without an explicit origin | Exporter seats the part; viewer shifts the pin row |
| `flashlight-origin.circuit.tsx` | USB mounting tabs and contacts meet their actual holes and pads | Viewer seats the connector; exporter shifts it |

The footprint is the mechanical reference. An edge match only establishes
agreement between renderers, not correct mounting.

## Real source models, not invented test shapes

The TO-92 source is the existing KiCad `TO-92_Inline.step` model. Its native
pin pitch is 1.27 mm; `real-parts/to92-footprint.tsx` authors matching 0.75 mm
plated holes and the original pad dimensions. The transistor's body and leads
are not resized, reshaped, or replaced by boxes.

The orientation cases use a native OBJ capture of that STEP model, then bake
only a proper rigid rotation into the source vertices and normals:

```text
X source:  Q = Rx(-90)             authored correction Rx(90)
Y source:  Q = Ry(-90)             authored correction Ry(90)
XY source: Q = Ry(-90) * Rx(-90)   authored correction Rx(90) * Ry(90)
```

Faces and material assignment are unchanged. Both renderers load the same
already-oriented source bytes; neither rendering pipeline is patched.
The explicit model origin in each TSX is the original contact midpoint
`(1.27,0,0)` expressed in that source orientation.

`scripts/generate-to92-native-obj.ts` documents the one-time native capture.
`scripts/prepare-real-part-assets.ts` produces the oriented OBJ files from the
committed native geometry without importing exporter code. See
[`real-parts/README.md`](real-parts/README.md) for provenance and geometry checks.

The origin repro keeps the original STEP asset and no origin override.
The flashlight uses the original C165948 model bytes and TSX-authored
mounting geometry. Their captured source references remain in `policy/`.

## Diagnostic mechanics

Each story automatically shows oblique and side views, neutral component-only
geometry, edge maps and the bidirectional fuzzy overlay. Cameras are shared;
there is no image registration, per-renderer fitting, pose correction, or saved
PNG approval baseline. Only final glTF coordinates are converted back to project
space using `P=(-G.x,G.z,G.y)`.

Actual renderer disagreements remain ordinary failed, non-blocking diagnostic
assertions. Loader failures remain visible rather than being replaced by a
surrogate model.

The `calibration` case is not in the review gallery. It uses the same real
compound-orientation TO-92 TSX, compares detached copies of the loaded viewer
geometry, and deliberately perturbs one copy to test matcher sensitivity.
It does not generate or load an exported GLB.

The earlier numeric `renderer-usb-mounting.test.ts` still checks the measured
MICRO_XNJ_ZB tab/hole and contact/pad fit using its original frozen inputs.
`legacy-usb-mounting.ts`, `usb.circuit.json`, and `assets/micro-xnj-zb.obj` support
that independent unit test only; they are not reviewer-facing repros.
