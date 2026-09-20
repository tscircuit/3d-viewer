# Real TO-92 source assets

`assets/to92-native.obj` is a tessellation of the actual KiCad TO-92 package,
not a synthetic transistor, clipped mesh, substitute primitive, or renderer
correction. The original `../policy/TO-92_Inline.step` is unchanged.

## Provenance and offline reproduction

The STEP was captured from `tscircuit/circuit-json-to-gltf` commit
`986b609b54b8c79859d5e900a1f181b98dc7573e`, at
`tests/assets/TO-92_Inline.step`. Its internal product name is
`TO-92_Inline_Narrow`; its header identifies KiCad StepUp, FreeCAD, Open CASCADE
6.8, and creation time `2017-11-28T22:16:31`. Coordinates are millimeters.

| Artifact | SHA-256 |
| --- | --- |
| Original STEP | `f0b61c32ecbf0067157adc5a3d4966ceadf5d6dafe93c51af35f76c41c71a54a` |
| Native OBJ | `2fc0c9de3dedaeff8db0769aafbf19ba9eab8b6ffa0ca93fa9aa53dd88916790` |

From the repository root, with its existing dependencies installed:

```sh
bun scripts/generate-to92-native-obj.ts
bun test ./tests/renderer-comparison-real-models.test.ts
```

Capture is an explicit, manual step, using the public
`convertCircuitJsonTo3D` API from pinned published
`circuit-json-to-gltf@0.0.130` and its installed OCCT decoder. It reads the
local STEP through a data URL, requiring no server, CDN or network. It passes
`coordinateTransform: {}`, explicit zero `model_origin_position`, zero
position and rotation, and no size, unit or board-normal override. The
required schema fields `anchor_alignment` and `model_object_fit` have no
effect because the origin is explicit and no size is supplied. There is no
board. Capture rejects missing meshes, empty triangles, missing materials,
invalid vectors, an unexpected package version or a changed STEP hash.

The public decoder produces 220 triangles with triangle normals and two
materials. Its OCCT adapter averages the source vertex normals per triangle
and quantizes colors to 8-bit RGB; the OBJ preserves that public representation,
without recomputing or normalizing normals. It has 660 `v` records, 220 `vn`
records and 220 faces. Separate per-triangle vertices avoid welding or reshaping
the source. Embedded `newmtl`/`endmtl` blocks retain the body and pin colors in
the convention supported by the viewer and exporter OBJ loaders.

| Material | Identity | RGB (8-bit) | Triangles |
| --- | --- | --- | --- |
| `Material_0` | Molded transistor body | 5, 5, 5 | 190 |
| `Material_1` | All three metallic leads | 165, 163, 146 | 30 |

The public API groups triangles by material, rather than exposing distinct
per-lead object IDs. Lead positions identify pins 1, 2 and 3.

## Ordinary preparation: rigid rotations only

`scripts/prepare-real-part-assets.ts` exports
`prepareRealPartAssets(outputAssetsDirectory: string): Promise<void>`.
It checks the native OBJ hash and writes these files beneath the supplied
directory's `real/` subdirectory:

| File | Source transform Q | Authored `rotationOffset` (intrinsic XYZ degrees) | Source contact datum Q*d |
| --- | --- | --- | --- |
| `to92-native.obj` | Identity (byte-for-byte copy) | (0, 0, 0) | (1.27, 0, 0) |
| `to92-x.obj` | Rx(-90) | (90, 0, 0) | (1.27, 0, 0) |
| `to92-y.obj` | Ry(-90) | (0, 90, 0) | (0, 0, 1.27) |
| `to92-xy.obj` | Ry(-90) * Rx(-90) | (90, 90, 0) | (0, 0, 1.27) |

The native contact datum is `d = (1.27, 0, 0)`. The mixed source transform is
the inverse of Three's intrinsic XYZ author rotation, not the reversed product.
`transformTo92Obj(text, variant)` is the pure string transform;
`getTo92SourceRotation(variant)` returns a fresh Three `Matrix4`.
`TO92_SOURCE_VARIANTS` describes the filenames, author rotations and datums.
These are preparation/test APIs, not browser imports: the module also imports
Node filesystem and crypto utilities.

Only actual `v` and `vn` bytes rotate, using Three `Matrix4`/`Vector3`. No
translation, recentering, scaling, face reindexing, topology changes, normal
renormalization or glTF node transforms are applied. A proper rotation
preserves winding. Material blocks and all other records are unchanged;
native provenance comments continue to identify the input to each rotation.
Neither renderer's coordinate frame, normalization or placement code is changed.
The source datum and authored CAD offset restore the physically upright
mounting; these are source assets, not viewer-side workarounds.

Ordinary preparation and the unit test never import or run the exporter.
Tests run before public assets are prepared: they exercise the pure transform
and an isolated temporary output directory. They check every inverse-rotated
vertex and normal, triangle/face/material preservation, source hashes,
loader compatibility, lead dimensions and deterministic repeated preparation.
Recapture is deliberately separate from this blocking path.

## Physical dimensions for the TSX footprint

Native lead centers are `(0, 0)`, `(1.27, 0)` and `(2.54, 0)`.
Each lead is 0.48 mm wide in X and 0.38 mm in Y, extending from Z=-2.5 to
Z=2.5. The rectangular cross-section's circumscribed diameter is
`hypot(0.48, 0.38) = 0.6122091146005587` mm; a circular hole must exceed
that to provide clearance. The existing exporter
`tests/assets/TO-92_Inline.json` uses 0.75 mm holes and 1.05 by 1.5 mm pads
(pin 1 rectangular, pins 2 and 3 pill-shaped). Its IDs are
`pcb_plated_hole_0`, `_1`, `_2`, associated with `pcb_port_0`, `_1`, `_2`
and `pcb_component_0`.

The tessellated body bounds are X=[-1.1446134575281226, 3.684613457528122],
Y=[-1.33, 2.411970560472463], Z=[2.5, 7.3] mm. These are mesh bounds, not
an assertion that a curved BRep's analytic extrema occur at tessellation
vertices. The positive-Y body bulge is native geometry, not an alignment error.
At a board-surface datum the body stands 2.5 mm above the board and the leads
extend 2.5 mm into/below it; do not recenter on the body's bounding box.
