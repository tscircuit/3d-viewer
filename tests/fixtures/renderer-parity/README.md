# Physically interpretable renderer repros

Every reviewer-facing case starts with a short TSX file in `circuits/`.
`compileRendererCircuit` runs that component through the pinned `tscircuit`
authoring runtime once. Its unmodified Circuit JSON is passed to both the
production viewer and the development-only published exporter.

There are no post-render changes to CAD rotations, positions, origins, pads,
holes, or board geometry. The TSX is displayed beside the comparison output.

Storybook groups these examples under **Renderer Parity**, with separate
**TO-92**, **USB-C Flashlight**, **M2 Daughtercard Prototype**, and
**Comparator Calibration** categories.

| Source | Physical criterion | Reference result with exporter 0.0.130 |
| --- | --- | --- |
| `to92-origin.circuit.tsx` | All three leads centered in holes without an explicit origin | Exporter seats the part; viewer shifts the pin row |
| `flashlight-origin.circuit.tsx` | USB mounting tabs and contacts meet their actual holes and pads | Viewer seats the connector; exporter shifts it |
| `m2-carrier.circuit.tsx` | M-key daughtercard stands in the real upright socket | Viewer seats the card; exporter lowers it through the host |

The footprint is the mechanical reference. An edge match only establishes
agreement between renderers, not correct mounting.

## Real source models, not invented test shapes

The TO-92 source is the existing KiCad `TO-92_Inline.step` model. Its native
pin pitch is 1.27 mm; `real-parts/to92-footprint.tsx` authors matching 0.75 mm
plated holes and the original pad dimensions. The transistor's body and leads
are not resized, reshaped, or replaced by boxes.

The manufactured TO-92 X/Y/XY source orientations and their generation scripts
have been removed. Rotational repros now use actual board assemblies and
unmodified source models, rather than baking a desired inverse rotation into
an asset.

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

Each physical example has its own `playwright/*.diagnostic.pw.ts` file containing
one explicitly named test. There is no parameterized test registry. Each test
captures both views and attaches its images; shared helpers only implement
capture and matching.

The `calibration` case is not in the review gallery. It loads the original STEP
in a deliberately arbitrary CAD pose, compares detached copies of the loaded
viewer geometry, and perturbs one copy to test matcher sensitivity. It makes
no physical mounting claim and does not generate or load an exported GLB.

The earlier numeric `renderer-usb-mounting.test.ts` still checks the measured
MICRO_XNJ_ZB tab/hole and contact/pad fit using its original frozen inputs.
`legacy-usb-mounting.ts`, `usb.circuit.json`, and `assets/micro-xnj-zb.obj` support
that independent unit test only; they are not reviewer-facing repros.

## Upright M.2 M-key socket

The socket and daughtercard have explicit `pcbX`, `pcbY` and `pcbRotation`.
Their relative pose is a mechanical assembly constraint, not an automatic PCB
packing suggestion. This keeps newer core packing defaults from moving or
rotating the socket independently of its mating card.

`bun run test:renderer-fixtures` runs the matcher and source/mounting tests.
The M.2 mesh test downloads its hash-checked source automatically on a fresh
checkout. For M.2-only preview preparation, run
`bun scripts/prepare-m2-daughtercard.ts`.

The M.2 story uses the detailed **Amphenol MDT350M01401VT** socket, downloaded
from a [commit-pinned STEP URL](https://raw.githubusercontent.com/Kmshanley/PicoSat-Initiative/9b3e0e6cb27fabb48df7f36363ebddf051e3932b/Hardware/OBC-Flight_Rev0/Parts/MDT350M01401VT/MDT350M01401VT.stp).
Its SHA-256 is checked against `m2.ts` before the unchanged STEP is copied into
the ignored public assets directory. The associated
[manufacturer drawing](https://raw.githubusercontent.com/Kmshanley/PicoSat-Initiative/9b3e0e6cb27fabb48df7f36363ebddf051e3932b/Hardware/OBC-Flight_Rev0/Parts/MDT350M01401VT/mdt350x01401vt.pdf)
defines the host pads and locating holes.

The previous `m2host` footprint was E-key; it cannot mate with this M-key socket.
The user-approved replacement is an explicit TSX M-key edge with positions
59-66 absent, a matching notch, 67 two-sided contacts and 0.8 mm board thickness.
The host now has 67 signal lands, two mounting lands and the two locating holes,
not the earlier stand-in clearance slot.

The actual shared-family STEP identifies `MDT350M0X001VT_C3D`. In its native
millimetre coordinates, +Y rises from the solder plane, the slot floor is
Y=2.839, slot walls are Z=+/-0.46, and the key center is X=-6.125. The authored
card insertion edge and thickness midplane align with these measured datums;
its GLB is exported from `m2-daughtercard.circuit.tsx` without geometry edits.

The contact window is now 0.50..2.00 mm behind the card edge: 1.50 mm long,
not the earlier 3.50 mm extension to the notch root. GS-12-1248 rev B pp.8-9
limits the leading inset to 0.55 mm; the 2.00 mm rear edge follows this
[pinned M-key card footprint](https://raw.githubusercontent.com/adryzz/M.2-kicad-lib/5bc128e8b7f72c07326cd24eef6d57e996072a99/footprints/M.2-Key-M.pretty/M.2-Key-M-2230.kicad_mod).
The nominal 0.50 mm inset and resulting 1.50 mm length are explicit coupon
choices, not claimed standard dimensions. The key notch retains its 3.50 mm
depth with an R0.60 full-radius root.

Seating is unchanged at the actual STEP floor, confirmed by intersections
through the open slot. The 2.661 mm insertion depth puts the contact rear edge
0.661 mm below the housing rim. The copper window contains the measured
undeflected-spring engagement band, 0.979..1.427 mm from the insertion edge.
The card is not lowered through the socket floor to conceal visible gold.

This is a mechanical comparison, not a certified connector design. Model
revision compatibility, spring deflection and retention are not validated;
shoulders remain square, contact geometry is simplified, and bevels and
electrical routing are omitted. The source, mounting and browser regressions
each have their own single-test file.
