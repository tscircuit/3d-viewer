import { CadViewer } from "src/CadViewer"

export const PcbNoteTextBasic = () => {
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
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_0",
            font: "tscircuit2024",
            font_size: 1,
            anchor_position: { x: 0, y: 3 },
            anchor_alignment: "center",
            text: "NOTE TEXT",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_1",
            font: "tscircuit2024",
            font_size: 0.5,
            anchor_position: { x: 0, y: 0 },
            anchor_alignment: "center",
            text: "Smaller Text",
          },
          // SMT pads for reference
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

export const PcbNoteTextColors = () => {
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
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_white",
            font: "tscircuit2024",
            font_size: 0.8,
            anchor_position: { x: -6, y: 5 },
            anchor_alignment: "center",
            text: "WHITE (default)",
            color: "rgb(255, 255, 255)",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_red",
            font: "tscircuit2024",
            font_size: 0.8,
            anchor_position: { x: 0, y: 5 },
            anchor_alignment: "center",
            text: "RED",
            color: "#FF0000",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_green",
            font: "tscircuit2024",
            font_size: 0.8,
            anchor_position: { x: 6, y: 5 },
            anchor_alignment: "center",
            text: "GREEN",
            color: "#00FF00",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_blue",
            font: "tscircuit2024",
            font_size: 0.8,
            anchor_position: { x: -6, y: 0 },
            anchor_alignment: "center",
            text: "BLUE",
            color: "rgb(0, 0, 255)",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_yellow",
            font: "tscircuit2024",
            font_size: 0.8,
            anchor_position: { x: 0, y: 0 },
            anchor_alignment: "center",
            text: "YELLOW",
            color: "#FFFF00",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_cyan",
            font: "tscircuit2024",
            font_size: 0.8,
            anchor_position: { x: 6, y: 0 },
            anchor_alignment: "center",
            text: "CYAN",
            color: "#00FFFF",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_magenta",
            font: "tscircuit2024",
            font_size: 0.8,
            anchor_position: { x: -6, y: -5 },
            anchor_alignment: "center",
            text: "MAGENTA",
            color: "#FF00FF",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_orange",
            font: "tscircuit2024",
            font_size: 0.8,
            anchor_position: { x: 0, y: -5 },
            anchor_alignment: "center",
            text: "ORANGE",
            color: "rgb(255, 165, 0)",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_no_color",
            font: "tscircuit2024",
            font_size: 0.8,
            anchor_position: { x: 6, y: -5 },
            anchor_alignment: "center",
            text: "NO COLOR",
          },
        ] as any
      }
    />
  )
}

export const PcbNoteTextAnchorAlignment = () => {
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
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_tl",
            font: "tscircuit2024",
            font_size: 0.5,
            anchor_position: { x: -6, y: 5 },
            anchor_alignment: "top_left",
            text: "top_left",
            color: "#FF0000",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_tr",
            font: "tscircuit2024",
            font_size: 0.5,
            anchor_position: { x: 6, y: 5 },
            anchor_alignment: "top_right",
            text: "top_right",
            color: "#00FF00",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_c",
            font: "tscircuit2024",
            font_size: 0.5,
            anchor_position: { x: 0, y: 0 },
            anchor_alignment: "center",
            text: "center",
            color: "#0000FF",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_bl",
            font: "tscircuit2024",
            font_size: 0.5,
            anchor_position: { x: -6, y: -5 },
            anchor_alignment: "bottom_left",
            text: "bottom_left",
            color: "#FFFF00",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_br",
            font: "tscircuit2024",
            font_size: 0.5,
            anchor_position: { x: 6, y: -5 },
            anchor_alignment: "bottom_right",
            text: "bottom_right",
            color: "#FF00FF",
          },
        ] as any
      }
    />
  )
}

export const PcbNoteTextFontSizes = () => {
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
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_0_5",
            font: "tscircuit2024",
            font_size: 0.5,
            anchor_position: { x: 0, y: 6 },
            anchor_alignment: "center",
            text: "0.5mm",
            color: "#FF0000",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_1",
            font: "tscircuit2024",
            font_size: 1,
            anchor_position: { x: 0, y: 3 },
            anchor_alignment: "center",
            text: "1mm",
            color: "#00FF00",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_1_5",
            font: "tscircuit2024",
            font_size: 1.5,
            anchor_position: { x: 0, y: 0 },
            anchor_alignment: "center",
            text: "1.5mm",
            color: "#0000FF",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_2",
            font: "tscircuit2024",
            font_size: 2,
            anchor_position: { x: 0, y: -3 },
            anchor_alignment: "center",
            text: "2mm",
            color: "#FFFF00",
          },
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_3",
            font: "tscircuit2024",
            font_size: 3,
            anchor_position: { x: 0, y: -6 },
            anchor_alignment: "center",
            text: "3mm",
            color: "#FF00FF",
          },
        ] as any
      }
    />
  )
}

export const PcbNoteTextWithSilkscreen = () => {
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
          // Silkscreen text (white)
          {
            type: "pcb_silkscreen_text",
            layer: "top",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
            font: "tscircuit2024",
            font_size: 0.8,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: -5, y: 3 },
            anchor_alignment: "center",
            text: "SILKSCREEN",
          },
          // Note text (colored)
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_0",
            font: "tscircuit2024",
            font_size: 0.8,
            anchor_position: { x: 5, y: 3 },
            anchor_alignment: "center",
            text: "NOTE TEXT",
            color: "#FF0000",
          },
          // Another note text
          {
            type: "pcb_note_text",
            pcb_note_text_id: "pcb_note_text_1",
            font: "tscircuit2024",
            font_size: 0.6,
            anchor_position: { x: 0, y: -3 },
            anchor_alignment: "center",
            text: "MIXED TEXT",
            color: "#00FF00",
          },
        ] as any
      }
    />
  )
}

export default {
  title: "Pcb Note Text",
  component: PcbNoteTextBasic,
}
