import { CadViewer } from "src/CadViewer"

const hexPadOutline = [
  { x: -2.2, y: -0.8 },
  { x: 0, y: -2.2 },
  { x: 2.2, y: -0.8 },
  { x: 2.6, y: 0.8 },
  { x: 0, y: 2.2 },
  { x: -2.6, y: 0.8 },
]

const polygonPadCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "polygon-pad-board",
    center: { x: 0, y: 0 },
    width: 60,
    height: 40,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "poly-circle",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    x: -15,
    y: 6,
    hole_diameter: 1.2,
    pad_outline: hexPadOutline,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "poly-oval",
    shape: "hole_with_polygon_pad",
    hole_shape: "oval",
    x: 0,
    y: -4,
    hole_width: 2.2,
    hole_height: 1.4,
    hole_offset_x: 0.4,
    pad_outline: hexPadOutline,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "poly-rotated-pill",
    shape: "hole_with_polygon_pad",
    hole_shape: "rotated_pill",
    hole_width: 2.6,
    hole_height: 1.2,
    ccw_rotation: 35,
    x: 15,
    y: 6,
    pad_outline: hexPadOutline,
    layers: ["top", "bottom"],
  },
] as const

export const PolygonPadPlatedHolesDemo = () => (
  <CadViewer circuitJson={polygonPadCircuit as any} />
)

export default {
  title: "Plated Holes/Polygon Pads",
  component: PolygonPadPlatedHolesDemo,
}
