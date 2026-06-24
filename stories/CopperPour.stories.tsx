import { CadViewer } from "src/CadViewer"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"

// Test a mix of rect and polygon pours on both layers
const soup: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 0, y: 0 },
    width: 200,
    height: 100,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  },
  // pour_brep_1: square with rounded-square hole
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_brep_1",
    layer: "top",
    shape: "brep",
    source_net_id: "net1",
    covered_with_solder_mask: true,
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -30, y: 30 },
          { x: -50, y: 30 },
          { x: -50, y: 10 },
          { x: -30, y: 10 },
        ],
      },
      inner_rings: [
        {
          vertices: [
            { x: -35, y: 25, bulge: 0.5 },
            { x: -45, y: 25 },
            { x: -45, y: 15 },
            { x: -35, y: 15 },
          ],
        },
      ],
    },
  } as PcbCopperPour,
  // pour_brep_2: Bulgy outer ring, two holes
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_brep_2",
    layer: "top",
    shape: "brep",
    source_net_id: "net2",
    covered_with_solder_mask: true,
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: 10, y: 30, bulge: -0.5 },
          { x: -10, y: 30 },
          { x: -10, y: 10, bulge: 0.5 },
          { x: 10, y: 10 },
        ],
      },
      inner_rings: [
        {
          // square hole
          vertices: [
            { x: -5, y: 25 },
            { x: -8, y: 25 },
            { x: -8, y: 22 },
            { x: -5, y: 22 },
          ],
        },
        {
          // triangular hole
          vertices: [
            { x: 5, y: 25 },
            { x: 8, y: 22 },
            { x: 5, y: 22 },
          ],
        },
      ],
    },
  } as PcbCopperPour,
  // pour_brep_3: Circular pour with square hole
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_brep_3",
    layer: "top",
    shape: "brep",
    source_net_id: "net3",
    covered_with_solder_mask: true,
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: 30, y: 20, bulge: 1 },
          { x: 50, y: 20, bulge: 1 },
        ],
      },
      inner_rings: [
        {
          vertices: [
            { x: 38, y: 22 },
            { x: 42, y: 22 },
            { x: 42, y: 18 },
            { x: 38, y: 18 },
          ],
        },
      ],
    },
  } as PcbCopperPour,
  // pour_brep_4: bottom layer pour
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_brep_4",
    layer: "bottom",
    shape: "brep",
    source_net_id: "net4",
    covered_with_solder_mask: true,
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -30, y: -10 },
          { x: -50, y: -10 },
          { x: -50, y: -30 },
          { x: -30, y: -30, bulge: 0.5 },
        ],
      },
    },
  } as PcbCopperPour,
  // pour_rect_1: A rect pour with rotation
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_rect_1",
    layer: "top",
    shape: "rect",
    source_net_id: "net5",
    center: { x: 0, y: -20 },
    width: 20,
    height: 10,
    rotation: 15,
    covered_with_solder_mask: true,
  } as PcbCopperPour,
  // pour_polygon_1: A polygon pour (triangle)
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_polygon_1",
    layer: "top",
    shape: "polygon",
    source_net_id: "net6",
    points: [
      { x: 30, y: -10 },
      { x: 50, y: -30 },
      { x: 30, y: -30 },
    ],
    covered_with_solder_mask: true,
  } as PcbCopperPour,
  // pour_rect_2: A rect pour without solder mask
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_rect_2",
    layer: "top",
    shape: "rect",
    source_net_id: "net7",
    center: { x: 70, y: 0 },
    width: 20,
    height: 10,
    covered_with_solder_mask: true,
  } as PcbCopperPour,
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_full_bottom",
    layer: "bottom",
    shape: "rect",
    source_net_id: "gnd",
    center: { x: 0, y: 0 },
    width: 198,
    height: 98,
    covered_with_solder_mask: true,
  } as PcbCopperPour,
]
export const Default = () => <CadViewer circuitJson={soup} />

export default {
  title: "Components/CopperPour",
  component: Default,
}
