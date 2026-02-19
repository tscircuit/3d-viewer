import { CadViewer } from "src/CadViewer"

export const SilkscreenTextKnockout = () => {
  return (
    <CadViewer
      circuitJson={
        [
          {
            type: "pcb_board",
            center: { x: 0, y: 0 },
            width: 30,
            height: 20,
            subcircuit_id: "pcb_generic_component_0",
            material: "fr4",
            num_layers: 2,
            pcb_board_id: "pcb_board_0",
            thickness: 1.6,
            is_subcircuit: false,
          },
          // Normal text for comparison
          {
            type: "pcb_silkscreen_text",
            layer: "top",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_normal",
            font: "tscircuit2024",
            font_size: 0.8,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: -8, y: 4 },
            anchor_alignment: "center",
            text: "NORMAL",
          },
          // Knockout text (default padding)
          {
            type: "pcb_silkscreen_text",
            layer: "top",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_knockout",
            font: "tscircuit2024",
            font_size: 0.8,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 8, y: 4 },
            anchor_alignment: "center",
            text: "KNOCKOUT",
            is_knockout: true,
          },
          // Knockout with custom padding
          {
            type: "pcb_silkscreen_text",
            layer: "top",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_knockout_padded",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: 0 },
            anchor_alignment: "center",
            text: "CUSTOM PAD",
            is_knockout: true,
            knockout_padding: {
              left: 1,
              right: 1,
              top: 0.5,
              bottom: 0.5,
            },
          },
          // Knockout with rotation
          {
            type: "pcb_silkscreen_text",
            layer: "top",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_knockout_rotated",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: -8, y: -4 },
            anchor_alignment: "center",
            text: "ROTATED",
            is_knockout: true,
            ccw_rotation: 45,
          },
          // Knockout on bottom layer
          {
            type: "pcb_silkscreen_text",
            layer: "bottom",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_knockout_bottom",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 8, y: -4 },
            anchor_alignment: "center",
            text: "BOTTOM KO",
            is_knockout: true,
          },
        ] as any
      }
    />
  )
}

export default {
  title: "Silkscreen Text/Knockout",
  component: SilkscreenTextKnockout,
}
