import { CadViewer } from "src/CadViewer"

export const CopperTextBasic = () => {
  return (
    <CadViewer
      circuitJson={
        [
          {
            type: "pcb_board",
            center: { x: 0, y: 0 },
            width: 20,
            height: 15,
            subcircuit_id: "pcb_generic_component_0",
            material: "fr4",
            num_layers: 2,
            pcb_board_id: "pcb_board_0",
            thickness: 1.6,
            is_subcircuit: false,
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_0",
            font: "tscircuit2024",
            font_size: 1,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: 3 },
            anchor_alignment: "center",
            text: "COPPER TEXT",
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_1",
            font: "tscircuit2024",
            font_size: 0.5,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: 0 },
            anchor_alignment: "center",
            text: "Smaller Text",
          },
          // SMT pads for comparison - copper text should match this color
          {
            type: "pcb_smtpad",
            layer: "top",
            pcb_smtpad_id: "pcb_smtpad_0",
            pcb_component_id: "pcb_generic_component_0",
            width: 2,
            height: 1,
            x: -5,
            y: -3,
            shape: "rect",
          },
          {
            type: "pcb_smtpad",
            layer: "top",
            pcb_smtpad_id: "pcb_smtpad_1",
            pcb_component_id: "pcb_generic_component_0",
            width: 2,
            height: 1,
            x: 5,
            y: -3,
            shape: "rect",
          },
        ] as any
      }
    />
  )
}

export const CopperTextBottomLayer = () => {
  return (
    <CadViewer
      circuitJson={
        [
          {
            type: "pcb_board",
            center: { x: 0, y: 0 },
            width: 20,
            height: 15,
            subcircuit_id: "pcb_generic_component_0",
            material: "fr4",
            num_layers: 2,
            pcb_board_id: "pcb_board_0",
            thickness: 1.6,
            is_subcircuit: false,
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_top",
            font: "tscircuit2024",
            font_size: 0.8,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: 2 },
            anchor_alignment: "center",
            text: "TOP LAYER",
          },
          {
            type: "pcb_copper_text",
            layer: "bottom",
            pcb_copper_text_id: "pcb_copper_text_bottom",
            font: "tscircuit2024",
            font_size: 0.8,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: -2 },
            anchor_alignment: "center",
            text: "BOTTOM LAYER",
          },
          // Bottom layer SMT pad for comparison
          {
            type: "pcb_smtpad",
            layer: "bottom",
            pcb_smtpad_id: "pcb_smtpad_bottom",
            pcb_component_id: "pcb_generic_component_0",
            width: 2,
            height: 1,
            x: -5,
            y: -2,
            shape: "rect",
          },
        ] as any
      }
    />
  )
}

export const CopperTextRotation = () => {
  return (
    <CadViewer
      circuitJson={
        [
          {
            type: "pcb_board",
            center: { x: 0, y: 0 },
            width: 20,
            height: 20,
            subcircuit_id: "pcb_generic_component_0",
            material: "fr4",
            num_layers: 2,
            pcb_board_id: "pcb_board_0",
            thickness: 1.6,
            is_subcircuit: false,
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_0",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: 4 },
            anchor_alignment: "center",
            text: "0 DEG",
            ccw_rotation: 0,
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_45",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 4, y: 0 },
            anchor_alignment: "center",
            text: "45 DEG",
            ccw_rotation: 45,
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_90",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: -4 },
            anchor_alignment: "center",
            text: "90 DEG",
            ccw_rotation: 90,
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_180",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: -4, y: 0 },
            anchor_alignment: "center",
            text: "180 DEG",
            ccw_rotation: 180,
          },
        ] as any
      }
    />
  )
}

export const CopperTextAnchorAlignment = () => {
  return (
    <CadViewer
      circuitJson={
        [
          {
            type: "pcb_board",
            center: { x: 0, y: 0 },
            width: 25,
            height: 20,
            subcircuit_id: "pcb_generic_component_0",
            material: "fr4",
            num_layers: 2,
            pcb_board_id: "pcb_board_0",
            thickness: 1.6,
            is_subcircuit: false,
          },
          // Reference point - a small SMT pad at origin
          {
            type: "pcb_smtpad",
            layer: "top",
            pcb_smtpad_id: "ref_pad",
            pcb_component_id: "pcb_generic_component_0",
            width: 0.5,
            height: 0.5,
            x: 0,
            y: 0,
            shape: "rect",
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_tl",
            font: "tscircuit2024",
            font_size: 0.5,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: -6, y: 5 },
            anchor_alignment: "top_left",
            text: "top_left",
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_tc",
            font: "tscircuit2024",
            font_size: 0.5,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: 5 },
            anchor_alignment: "top_center",
            text: "top_center",
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_tr",
            font: "tscircuit2024",
            font_size: 0.5,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 6, y: 5 },
            anchor_alignment: "top_right",
            text: "top_right",
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_cl",
            font: "tscircuit2024",
            font_size: 0.5,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: -6, y: 0 },
            anchor_alignment: "center_left",
            text: "center_left",
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_c",
            font: "tscircuit2024",
            font_size: 0.5,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: 0 },
            anchor_alignment: "center",
            text: "center",
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_cr",
            font: "tscircuit2024",
            font_size: 0.5,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 6, y: 0 },
            anchor_alignment: "center_right",
            text: "center_right",
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_bl",
            font: "tscircuit2024",
            font_size: 0.5,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: -6, y: -5 },
            anchor_alignment: "bottom_left",
            text: "bottom_left",
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_bc",
            font: "tscircuit2024",
            font_size: 0.5,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: -5 },
            anchor_alignment: "bottom_center",
            text: "bottom_center",
          },
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_br",
            font: "tscircuit2024",
            font_size: 0.5,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 6, y: -5 },
            anchor_alignment: "bottom_right",
            text: "bottom_right",
          },
        ] as any
      }
    />
  )
}

export const CopperTextKnockout = () => {
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
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_normal",
            font: "tscircuit2024",
            font_size: 0.8,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: -8, y: 4 },
            anchor_alignment: "center",
            text: "NORMAL",
          },
          // Knockout text (default padding)
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_knockout",
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
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_knockout_padded",
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
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "pcb_copper_text_knockout_rotated",
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
            type: "pcb_copper_text",
            layer: "bottom",
            pcb_copper_text_id: "pcb_copper_text_knockout_bottom",
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

export const CopperTextMirroring = () => {
  return (
    <CadViewer
      circuitJson={
        [
          {
            type: "pcb_board",
            center: { x: 0, y: 0 },
            width: 30,
            height: 25,
            subcircuit_id: "pcb_generic_component_0",
            material: "fr4",
            num_layers: 2,
            pcb_board_id: "pcb_board_0",
            thickness: 1.6,
            is_subcircuit: false,
          },
          // Top layer - normal (not mirrored)
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "top_normal",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: -8, y: 8 },
            anchor_alignment: "center",
            text: "TOP NORMAL",
          },
          // Top layer - explicitly mirrored
          {
            type: "pcb_copper_text",
            layer: "top",
            pcb_copper_text_id: "top_mirrored",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 8, y: 8 },
            anchor_alignment: "center",
            text: "TOP MIRRORED",
            is_mirrored: true,
          },
          // Bottom layer - auto-mirrored (default)
          {
            type: "pcb_copper_text",
            layer: "bottom",
            pcb_copper_text_id: "bottom_auto",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: -8, y: 0 },
            anchor_alignment: "center",
            text: "BTM AUTO MIRROR",
          },
          // Bottom layer - explicitly NOT mirrored
          {
            type: "pcb_copper_text",
            layer: "bottom",
            pcb_copper_text_id: "bottom_not_mirrored",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 8, y: 0 },
            anchor_alignment: "center",
            text: "BTM NO MIRROR",
            is_mirrored: false,
          },
          // Bottom layer with rotation + auto-mirror
          {
            type: "pcb_copper_text",
            layer: "bottom",
            pcb_copper_text_id: "bottom_rotated",
            font: "tscircuit2024",
            font_size: 0.6,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: -8 },
            anchor_alignment: "center",
            text: "BTM ROT 45",
            ccw_rotation: 45,
          },
        ] as any
      }
    />
  )
}

export default {
  title: "Copper Text",
  component: CopperTextBasic,
}
