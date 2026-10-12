import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "src/CadViewer"

// The opening straddles the right edge of a neighboring rectangular pad.
// Looking through it must reveal a clear bore, rather than the pad's fill wall.
const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 8,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  ...[-2, 2].flatMap((y) => [
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: `rect-${y}`,
      pcb_component_id: "component",
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      x: -1,
      y,
      hole_diameter: 0.5,
      rect_pad_width: 4,
      rect_pad_height: 2,
      layers: ["top", "bottom"],
      covered_with_solder_mask: false,
    },
    y < 0
      ? {
          type: "pcb_plated_hole",
          pcb_plated_hole_id: "edge-hole",
          pcb_component_id: "component",
          shape: "circle",
          x: 1,
          y,
          hole_diameter: 1,
          outer_diameter: 1.4,
          layers: ["top", "bottom"],
        }
      : {
          type: "pcb_via",
          pcb_via_id: "edge-via",
          x: 1,
          y,
          hole_diameter: 1,
          outer_diameter: 1.4,
          layers: ["top", "bottom"],
        },
  ]),
] as AnyCircuitElement[]

export const PlatedHoleAndViaAtPadEdge = () => (
  <CadViewer circuitJson={circuitJson} />
)
export default { title: "Bugs/Overlapping Hole Copper" }
