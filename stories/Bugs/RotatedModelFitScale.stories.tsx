import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "src/CadViewer"

/**
 * A model whose declared `size` already matches its mesh must render 1:1 at
 * every angle. It used to shrink at any rotation that was not a multiple of
 * 90 degrees.
 *
 * `getObjectBoundsRelativeToParent` measured each mesh by transforming its
 * bounding box into world space and then back into the parent's frame with two
 * separate `Box3.applyMatrix4` calls. That call re-derives an axis-aligned box
 * around the transformed corners, so it does not invert: the round trip widened
 * the box twice instead of cancelling. This 9.5 x 6.05mm switch measured
 * 14.74 x 14.28 at 30 degrees, and the fit then shrank it to 0.42 to squeeze
 * that phantom size into its declared `size`.
 *
 * Right angles were always fine -- an axis-aligned box is rotation-invariant
 * there -- so the tell is comparing the rotated parts against the 0 degree one.
 *
 * Each switch must declare `size` to reproduce this: both renderers skip the
 * fit entirely when it is absent, which is why the same part in core's own
 * fixtures never showed the defect.
 */

// KH-6X6X15H-SMT-FS-D, package SW-SMD_4P-L6.0-W6.0-P4.50-LS9.5-H15.0: a 6x6mm
// body on gull-wing leads spanning 9.5mm, with a 15mm plunger.
const MODEL_URL =
  "https://modelcdn.tscircuit.com/easyeda_models/assets/C18186519.obj?uuid=152d242aeb424b63a926a84b518edee1"
const MESH_SIZE = { x: 9.5, y: 6.0501, z: 15 }
const PAD_OFFSETS = [
  { x: -4.2, y: 2.2498 },
  { x: 4.2, y: 2.2498 },
  { x: -4.2, y: -2.2498 },
  { x: 4.2, y: -2.2498 },
]
const BODY_HALF = 3.048

const rotate = (x: number, y: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { x: x * cos - y * sin, y: x * sin + y * cos }
}

/**
 * One switch, rotated. The pads and the silkscreen outline turn with it, so a
 * shrunken model visibly pulls away from both.
 */
const switchAt = (
  index: number,
  center: { x: number; y: number },
  degrees: number,
): AnyCircuitElement[] => {
  const id = `sw${index}`
  return [
    {
      type: "source_component",
      source_component_id: `source_${id}`,
      name: `SW${index}`,
      ftype: "simple_chip",
    } as any,
    {
      type: "pcb_component",
      pcb_component_id: `pcb_${id}`,
      source_component_id: `source_${id}`,
      center,
      width: 10.25,
      height: 6.05,
      rotation: degrees,
      layer: "top",
    } as any,
    ...PAD_OFFSETS.map((offset, padIndex) => {
      const spun = rotate(offset.x, offset.y, degrees)
      return {
        type: "pcb_smtpad",
        pcb_smtpad_id: `pad_${id}_${padIndex}`,
        pcb_component_id: `pcb_${id}`,
        shape: "rotated_rect",
        x: center.x + spun.x,
        y: center.y + spun.y,
        width: 1.85,
        height: 1.1,
        ccw_rotation: degrees,
        layer: "top",
      } as any
    }),
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: `silk_${id}`,
      pcb_component_id: `pcb_${id}`,
      layer: "top",
      stroke_width: 0.1,
      route: [
        [-BODY_HALF, -BODY_HALF],
        [BODY_HALF, -BODY_HALF],
        [BODY_HALF, BODY_HALF],
        [-BODY_HALF, BODY_HALF],
        [-BODY_HALF, -BODY_HALF],
      ].map(([x, y]) => {
        const spun = rotate(x!, y!, degrees)
        return { x: center.x + spun.x, y: center.y + spun.y }
      }),
    } as any,
    {
      type: "cad_component",
      cad_component_id: `cad_${id}`,
      pcb_component_id: `pcb_${id}`,
      source_component_id: `source_${id}`,
      position: { x: center.x, y: center.y, z: 0.6 },
      rotation: { x: 0, y: 0, z: degrees },
      layer: "top",
      model_obj_url: MODEL_URL,
      model_origin_position: { x: 0, y: 0, z: 0 },
      // Without this the fit is skipped and the bug cannot appear.
      size: MESH_SIZE,
      model_object_fit: "contain_within_bounds",
      anchor_alignment: "center_of_component_on_board_surface",
    } as any,
  ]
}

const ROTATIONS = [0, 30, 45, 90]

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 70,
    height: 20,
    thickness: 1.2,
    num_layers: 2,
    material: "fr4",
  } as any,
  ...ROTATIONS.flatMap((degrees, index) =>
    switchAt(index, { x: -24 + index * 16, y: 0 }, degrees),
  ),
]

export const Default = () => <CadViewer circuitJson={circuitJson} />

export default {
  title: "Bugs/Rotated Model Fit Scale",
  component: Default,
}
