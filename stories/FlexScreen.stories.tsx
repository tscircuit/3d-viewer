import type { Meta, StoryObj } from "@storybook/react"
import type { CircuitJson } from "circuit-json"
import { CadViewer } from "src/CadViewer"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_watch",
    center: { x: 0, y: -16 },
    width: 42,
    height: 32,
    thickness: 1.6,
    num_layers: 4,
    material: "fr4",
    solder_mask_color: "#14532d",
    silkscreen_color: "white",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_screen",
    source_component_id: "source_component_screen",
    center: { x: 0, y: 0 },
    width: 0,
    height: 0,
    rotation: 0,
    layer: "top",
    obstructs_within_bounds: false,
    do_not_place: true,
    is_allowed_to_be_off_board: true,
    cable_insertion_center: { x: 0, y: 0 },
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_screen",
    pcb_component_id: "pcb_component_screen",
    source_component_id: "source_component_screen",
    position: { x: 0, y: 0, z: 0.8 },
    rotation: { x: 0, y: 0, z: 0 },
    model_origin_position: { x: 0, y: 0, z: 0 },
    model_unit_to_mm_scale_factor: 1,
    model_object_fit: "contain_within_bounds",
    anchor_alignment: "center",
    footprinter_string:
      "flexscreen_w40mm_h22.5mm_flex45mm_flexwidth12mm_conductors12_foldsabove_distance10mm_foldstart8mm_outset5mm",
  },
] satisfies CircuitJson

const meta = {
  title: "Modelprinter/FlexScreen",
  component: CadViewer,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CadViewer>

export default meta

type Story = StoryObj<typeof meta>

export const FoldedAboveBoard: Story = {
  args: {
    circuitJson,
  },
}
