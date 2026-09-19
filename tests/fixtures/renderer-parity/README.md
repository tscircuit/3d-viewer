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

## Origin, position, and fit policy stories

`policy-cases.ts` adds the exporter fixtures whose expectations changed during
the canonical-coordinate migration. These stories use the original inputs,
not silently corrected versions:

| Case | Original input | Separately labelled control |
| --- | --- | --- |
| TO-92 STEP | No explicit model origin | Only `model_origin_position=(1.27,0,0)` is added |
| USB-C flashlight | Original positions and missing origins for all components | None; whole-board normal views and a USB-only geometry comparison |
| SOIC8 glTF | CAD position/source association and board thickness omitted | Only CAD position `(0,0,1.8)` is added |
| SOIC8 footprinter | The same sparse input, using the real generated-model branch | Only CAD position `(0,0,1.8)` is added |
| Unit scale plus fit | Original boardless STL, unit scale 2, size `(1,1,1)` | Equivalent OBJ triangles with an explicit shared board and Z=0.8, leaving unit scale and target size unchanged |

The raised-position controls reproduce the previous exporter's generated
fallback; they do not claim that 1.8 mm is the correct physical mounting height.
Likewise, an edge match does not prove pins align with pads. The TO-92 original
and explicit-midpoint stories deliberately make that distinction inspectable.

Sparse CAD records stay sparse. For records without source IDs, the harness
selects the exported glTF node by a declared node index rather than injecting
labels or source associations. Viewer target discovery follows the production
preprocessing and placement helpers solely to locate the loaded subtree; it
does not adjust either renderer's geometry. Footprinter's direct mesh group is
handled separately from the common model transform graph.

The original STL case retains the production viewer's actual loading outcome.
An empty/failed load is an error with the exporter view still visible, not a
placeholder accepted as matching geometry. The OBJ control isolates fitting
from that decoder issue and from automatic faux-board placement.

See [`policy/README.md`](policy/README.md) for captured input and asset provenance.
Generated assets are prepared for both Storybook and the existing non-blocking
browser diagnostics, so every new case receives oblique and side comparisons.
