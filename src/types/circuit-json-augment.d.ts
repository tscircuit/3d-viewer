import type { LayerRef, Length, Point } from "circuit-json"

declare module "circuit-json" {
  export interface PcbSilkscreenRect {
    type: "pcb_silkscreen_rect"
    pcb_silkscreen_rect_id: string
    pcb_component_id: string
    pcb_group_id?: string
    subcircuit_id?: string
    center: Point
    width: Length
    height: Length
    layer: LayerRef
    stroke_width: Length
    corner_radius?: Length
    is_filled?: boolean
    has_stroke?: boolean
    is_stroke_dashed?: boolean
  }
}
