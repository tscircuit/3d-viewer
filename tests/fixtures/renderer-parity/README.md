# Renderer parity diagnostic fixtures

These inputs exercise the actual viewer and the development-only
`circuit-json-to-gltf` dependency. They are not image baselines.

- `clip.circuit.json` is the existing OBJ story from
  `3d-viewer/stories/Models.stories.tsx`, captured with the original angles and
  CAD datum. Geometry preparation creates explicitly labelled variants of this
  input. The contact OBJ, glTF, GLB, and glTF buffer are copied from this repo's
  existing `stories/assets` files, not downloaded during tests.
- `usb.circuit.json` comes from
  `infer-cable-insertion-point/tests/usb-connectors/MICRO_XNJ_ZB.test.tsx` and its
  imported C668587 part. The original example is boardless. For this comparison,
  the viewer's usual 10 x 12.8501728 x 1.4 mm reference board and +0.7 mm CAD
  anchor adjustment are supplied to both consumers explicitly.
- `assets/micro-xnj-zb.obj` is the captured source asset from
  `https://modelcdn.tscircuit.com/easyeda_models/download?uuid=e97a09b2fbda4e3cb5104f06bb774184&pn=C668587`.
  SHA-256: `12009ec1270ee5b963499061d1cd24cd054aadb1842731ae638dd16c1661dcf3`.
  The original part source was at commit
  `dc486fc` of `tscircuit/infer-cable-insertion-point`.

The original contact OBJ references an unavailable MTL file; the existing
source is retained. Geometry-only comparisons intentionally exclude material
and texture appearance.

`cases.ts` distinguishes controls, angle differences, missing-origin behavior,
format dispatch, and the physical USB mounting example. Explicit zero origins
isolate rotation from the contact-centering discrepancy. The missing-origin
cases intentionally preserve that discrepancy.
The nonzero angle probes are deliberately non-cardinal. The USB mounting case
is instead constrained by its physical mounting features:

- Native mesh is already Z-up; right-handed rotation is `(0, 0, 270)` degrees.
- Absolute CAD datum is `(1.3824742, 0, 1.975)` mm, with explicit model origin zero.
- Gold contacts sit at the reference board's top surface, Z = 0.7 mm.
- The two pill slots are rotated 90 degrees in this derived fixture only:
  their original long-axis directions disagree with the rotated metal tabs.
- The four shell tabs, including intersections at the board surfaces, fit the
  resulting apertures; all five contacts land on their respective pads.

`renderer-usb-mounting.test.ts` checks the actual OBJ geometry against those
holes and pads. `apply-case.ts` creates the controlled input without changing
the captured seed or any renderer implementation. `usb-zero` deliberately keeps
the original missing-origin input as a separate origin-policy diagnostic.
An explicit nonzero glTF model datum and an implicit bottom-layer orientation
are separate cases, so origin-frame conversion and fallback orientation are
not conflated with the explicit-angle comparisons.

Generated GLBs and the manifest live in the ignored story `public/generated`
directory. An exporter exception is recorded as a renderer failure, not
silently converted into a substitute model. Neither renderer is patched by
this suite.
