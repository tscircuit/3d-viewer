export type PcbCopperTextAnchorAlignment =
  | "center"
  | "top_left"
  | "top_center"
  | "top_right"
  | "center_left"
  | "center_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right"

export interface PcbCopperText {
  type: "pcb_copper_text"
  pcb_copper_text_id: string
  pcb_group_id?: string
  subcircuit_id?: string
  font: "tscircuit2024"
  font_size: number | string
  pcb_component_id: string
  text: string
  is_knockout?: boolean
  knockout_padding?: {
    left: number | string
    top: number | string
    bottom: number | string
    right: number | string
  }
  ccw_rotation?: number
  layer: "top" | "bottom"
  is_mirrored?: boolean
  anchor_position: { x: number; y: number }
  anchor_alignment?: PcbCopperTextAnchorAlignment | string
}
