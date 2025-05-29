import { CadViewer } from "src/CadViewer"
import type { AnyCircuitElement } from "circuit-json"

const createTopLeftBottomRightCircuit = (): AnyCircuitElement[] => {
  return [
    {
      type: "pcb_board",
      width: 12,
      height: 12,
      center: { x: 0, y: 0 },
      pcb_board_id: "pcb_board_0",
      thickness: 1.2,
      material: "fr4",
      num_layers: 2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_top_left",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "top_left",
      text: "TL",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_bottom_right",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "bottom_right",
      text: "BR",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_center_0",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "BC",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
  ]
}

export const TopLeftBottomRight = () => {
  const circuitJson = createTopLeftBottomRightCircuit()
  return <CadViewer circuitJson={circuitJson} />
}

const createTopRightBottomLeftCircuit = (): AnyCircuitElement[] => {
  return [
    {
      type: "pcb_board",
      width: 12,
      height: 12,
      center: { x: 0, y: 0 },
      pcb_board_id: "pcb_board_1",
      thickness: 1.2,
      material: "fr4",
      num_layers: 2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_top_right",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "top_right",
      text: "TR",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_bottom_left",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "bottom_left",
      text: "BL",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_center_1",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "BC",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
  ]
}

export const TopRightBottomLeft = () => {
  const circuitJson = createTopRightBottomLeftCircuit()
  return <CadViewer circuitJson={circuitJson} />
}

const createCenterRightCenterLeftCircuit = (): AnyCircuitElement[] => {
  return [
    {
      type: "pcb_board",
      width: 12,
      height: 12,
      center: { x: 0, y: 0 },
      pcb_board_id: "pcb_board_2",
      thickness: 1.2,
      material: "fr4",
      num_layers: 2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_center_right",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center_right",
      text: "CR",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_center_left",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center_left",
      text: "CL",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_center_2",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "BC",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
  ]
}

export const CenterRightCenterLeft = () => {
  const circuitJson = createCenterRightCenterLeftCircuit()
  return <CadViewer circuitJson={circuitJson} />
}

const createBottomCenterTopCenterCircuit = (): AnyCircuitElement[] => {
  return [
    {
      type: "pcb_board",
      width: 12,
      height: 12,
      center: { x: 0, y: 0 },
      pcb_board_id: "pcb_board_3",
      thickness: 1.2,
      material: "fr4",
      num_layers: 2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_bottom_center",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "bottom_center",
      text: "BC",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_top_center",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "top_center",
      text: "TC",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_center_3",
      font_size: 1,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "BC",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
    },
  ]
}

export const BottomCenterTopCenter = () => {
  const circuitJson = createBottomCenterTopCenterCircuit()
  return <CadViewer circuitJson={circuitJson} />
}

export default {
  title: "Silkscreen Text/Anchor Alignment",
  component: TopLeftBottomRight,
}
