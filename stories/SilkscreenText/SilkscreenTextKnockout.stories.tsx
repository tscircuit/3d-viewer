import { CadViewer } from "src/CadViewer"
import type { AnyCircuitElement } from "circuit-json"

export const SilkscreenTextKnockout = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      center: { x: 0, y: 0 },
      width: 20,
      height: 15,
      subcircuit_id: "pcb_generic_component_0",
      material: "fr4",
      num_layers: 2,
      pcb_board_id: "pcb_board_0",
      thickness: 1,
      is_subcircuit: false,
    },
    // Regular silkscreen text for comparison
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_regular",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: -5, y: 3 },
      anchor_alignment: "center",
      text: "REGULAR",
      is_knockout: false,
    },
    // Knockout silkscreen text with default padding
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_knockout",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: -5, y: 0 },
      anchor_alignment: "center",
      text: "KNOCKOUT",
      is_knockout: true,
    },
    // Knockout text with custom padding
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_padded",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: -5, y: -3 },
      anchor_alignment: "center",
      text: "PADDED",
      is_knockout: true,
      knockout_padding: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
      },
    },
    // Knockout text on bottom layer
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "text_bottom",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 5, y: 0 },
      anchor_alignment: "center",
      text: "BOTTOM",
      is_knockout: true,
    },
    // Rotated knockout text
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_rotated",
      font: "tscircuit2024",
      font_size: 0.8,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 5, y: 3 },
      anchor_alignment: "center",
      text: "ROTATED",
      is_knockout: true,
      ccw_rotation: 45,
    },
  ]

  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "Silkscreen Text/Knockout",
  component: SilkscreenTextKnockout,
}
