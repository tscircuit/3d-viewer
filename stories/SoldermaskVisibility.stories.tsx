import { CadViewer } from "src/CadViewer"

/**
 * This story demonstrates the soldermask visibility feature.
 * Use the Appearance menu to toggle top/bottom soldermask layers.
 *
 * The soldermask is the green coating that covers the PCB board,
 * with openings for pads, vias, and plated holes where copper is exposed.
 */

const soldermaskDemoCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    center: { x: 0, y: 0 },
    width: 30,
    height: 25,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  // Top layer component
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_top",
    center: { x: -8, y: 5 },
    width: 4,
    height: 2,
    rotation: 0,
    layer: "top",
    source_component_id: "source_top",
    obstructs_within_bounds: false,
  },
  // Bottom layer component
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_bottom",
    center: { x: 8, y: -5 },
    width: 4,
    height: 2,
    rotation: 0,
    layer: "bottom",
    source_component_id: "source_bottom",
    obstructs_within_bounds: false,
  },
  // SMT pads on top layer - rectangular
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_top_1",
    pcb_component_id: "pcb_component_top",
    shape: "rect",
    x: -10,
    y: 5,
    width: 1.5,
    height: 1,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_top_2",
    pcb_component_id: "pcb_component_top",
    shape: "rect",
    x: -6,
    y: 5,
    width: 1.5,
    height: 1,
    layer: "top",
  },
  // SMT pads on top layer - circular
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_top_3",
    pcb_component_id: "pcb_component_top",
    shape: "circle",
    x: -8,
    y: 8,
    radius: 0.8,
    layer: "top",
  },
  // SMT pads on bottom layer
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_bottom_1",
    pcb_component_id: "pcb_component_bottom",
    shape: "rect",
    x: 6,
    y: -5,
    width: 1.5,
    height: 1,
    layer: "bottom",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_bottom_2",
    pcb_component_id: "pcb_component_bottom",
    shape: "rect",
    x: 10,
    y: -5,
    width: 1.5,
    height: 1,
    layer: "bottom",
  },
  // Vias (visible on both sides through soldermask)
  {
    type: "pcb_via",
    pcb_via_id: "via_1",
    x: 0,
    y: 0,
    hole_diameter: 0.3,
    outer_diameter: 0.6,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "via_2",
    x: 2,
    y: 2,
    hole_diameter: 0.3,
    outer_diameter: 0.6,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "via_3",
    x: -2,
    y: -2,
    hole_diameter: 0.3,
    outer_diameter: 0.6,
    layers: ["top", "bottom"],
  },
  // Plated holes
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "plated_hole_1",
    pcb_component_id: "pcb_component_top",
    x: 5,
    y: 8,
    hole_diameter: 0.8,
    outer_diameter: 1.4,
    shape: "circle",
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "plated_hole_2",
    pcb_component_id: "pcb_component_bottom",
    x: -5,
    y: -8,
    hole_diameter: 0.8,
    outer_diameter: 1.4,
    shape: "circle",
    layers: ["top", "bottom"],
  },
  // Traces on top layer (covered by soldermask)
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_top_1",
    route: [
      { route_type: "wire", x: -10, y: 5, width: 0.25, layer: "top" },
      { route_type: "wire", x: -6, y: 5, width: 0.25, layer: "top" },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_top_2",
    route: [
      { route_type: "wire", x: -8, y: 8, width: 0.25, layer: "top" },
      { route_type: "wire", x: 0, y: 0, width: 0.25, layer: "top" },
    ],
  },
  // Traces on bottom layer
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_bottom_1",
    route: [
      { route_type: "wire", x: 6, y: -5, width: 0.25, layer: "bottom" },
      { route_type: "wire", x: 10, y: -5, width: 0.25, layer: "bottom" },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_bottom_2",
    route: [
      { route_type: "wire", x: 0, y: 0, width: 0.25, layer: "bottom" },
      { route_type: "wire", x: -5, y: -8, width: 0.25, layer: "bottom" },
    ],
  },
  // Silkscreen text on top
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk_top",
    pcb_component_id: "pcb_component_top",
    text: "TOP",
    layer: "top",
    anchor_position: { x: -8, y: -2 },
    anchor_alignment: "center",
    font_size: 1.5,
    font: "tscircuit2024",
  },
  // Silkscreen text on bottom
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk_bottom",
    pcb_component_id: "pcb_component_bottom",
    text: "BOTTOM",
    layer: "bottom",
    anchor_position: { x: 8, y: 2 },
    anchor_alignment: "center",
    font_size: 1.5,
    font: "tscircuit2024",
  },
]

export const SoldermaskDemo = () => (
  <CadViewer circuitJson={soldermaskDemoCircuit as any} />
)

export default {
  title: "Soldermask Visibility",
  component: SoldermaskDemo,
}

/**
 * A more complex example with copper pours showing soldermask coverage
 */
const soldermaskWithCopperPour = [
  {
    type: "pcb_board",
    pcb_board_id: "board_2",
    center: { x: 0, y: 0 },
    width: 40,
    height: 30,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_comp_1",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    rotation: 0,
    layer: "top",
    source_component_id: "source_1",
    obstructs_within_bounds: false,
  },
  // Copper pour WITH soldermask (default)
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_with_mask",
    layer: "top",
    shape: "rect",
    center: { x: -12, y: 0 },
    width: 12,
    height: 20,
    covered_with_solder_mask: true,
  } as any,
  // Copper pour WITHOUT soldermask (exposed copper)
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_without_mask",
    layer: "top",
    shape: "rect",
    center: { x: 12, y: 0 },
    width: 12,
    height: 20,
    covered_with_solder_mask: false,
  } as any,
  // Some pads
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "center_pad",
    pcb_component_id: "pcb_comp_1",
    shape: "rect",
    x: 0,
    y: 0,
    width: 2,
    height: 2,
    layer: "top",
  },
  // Silkscreen labels
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "label_covered",
    pcb_component_id: "pcb_comp_1",
    text: "MASKED",
    layer: "top",
    anchor_position: { x: -12, y: -12 },
    anchor_alignment: "center",
    font_size: 1.2,
    font: "tscircuit2024",
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "label_exposed",
    pcb_component_id: "pcb_comp_1",
    text: "EXPOSED",
    layer: "top",
    anchor_position: { x: 12, y: -12 },
    anchor_alignment: "center",
    font_size: 1.2,
    font: "tscircuit2024",
  },
]

export const SoldermaskWithCopperPour = () => (
  <CadViewer circuitJson={soldermaskWithCopperPour as any} />
)
