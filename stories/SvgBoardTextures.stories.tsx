import { useState } from "react"
import { CadViewer } from "src/CadViewer"
import type { AnyCircuitElement } from "circuit-json"

const createTestCircuit = (): AnyCircuitElement[] => {
  return [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    // Top copper traces
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_1",
      route: [
        { x: -3, y: -3, route_type: "wire", width: 0.2, layer: "top" },
        { x: -1, y: -3, route_type: "wire", width: 0.2, layer: "top" },
        { x: -1, y: -1, route_type: "wire", width: 0.2, layer: "top" },
        { x: 1, y: -1, route_type: "wire", width: 0.2, layer: "top" },
      ],
    },
    // SMT Pads - top
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      pcb_component_id: "comp_1",
      x: -2,
      y: -2,
      layer: "top",
      shape: "rect",
      width: 1.5,
      height: 0.8,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_2",
      pcb_component_id: "comp_1",
      x: 2,
      y: -2,
      layer: "top",
      shape: "circle",
      radius: 0.6,
    },
    // SMT Pads - bottom
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_3",
      pcb_component_id: "comp_2",
      x: -2,
      y: 2,
      layer: "bottom",
      shape: "rect",
      width: 1.5,
      height: 0.8,
    },
    // Silkscreen - top
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_1",
      pcb_component_id: "comp_1",
      text: "R1",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      font_size: 1,
      font: "tscircuit2024",
    },
    {
      type: "pcb_silkscreen_line",
      pcb_silkscreen_line_id: "line_1",
      pcb_component_id: "comp_1",
      stroke_width: 0.1,
      x1: -2.5,
      y1: 0,
      x2: 2.5,
      y2: 0,
      layer: "top",
    },
    // Silkscreen - bottom
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_2",
      pcb_component_id: "comp_2",
      text: "C1",
      layer: "bottom",
      anchor_position: { x: 0, y: 2 },
      anchor_alignment: "center",
      font_size: 1,
      font: "tscircuit2024",
    },
    // Plated hole (through-hole)
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_1",
      pcb_component_id: "comp_3",
      x: 3,
      y: 3,
      layers: ["top", "bottom"],
      shape: "circle",
      hole_diameter: 0.8,
      outer_diameter: 1.2,
    },
    // Via
    {
      type: "pcb_via",
      pcb_via_id: "via_1",
      x: 0,
      y: 0,
      outer_diameter: 0.6,
      hole_diameter: 0.3,
      layers: ["top", "bottom"],
    },
  ]
}

export const SvgTexturesDisabled = () => {
  const circuitJson = createTestCircuit()
  return (
    <div style={{ width: "100%", height: "500px" }}>
      <CadViewer circuitJson={circuitJson} />
    </div>
  )
}

SvgTexturesDisabled.storyName = "SVG Textures (Disabled - Default)"

export const SvgTexturesEnabled = () => {
  const circuitJson = createTestCircuit()
  const [status, setStatus] = useState<string>("Loading...")

  return (
    <div style={{ width: "100%", height: "500px", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "8px 12px",
          borderRadius: 4,
          fontSize: 12,
          zIndex: 100,
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 4 }}>
          SVG Textures: Enabled
        </div>
        <div>Status: {status}</div>
        <div style={{ marginTop: 8, fontSize: 10, opacity: 0.8 }}>
          Higher quality rendering using resvg-wasm
        </div>
      </div>
      <CadViewer circuitJson={circuitJson} />
    </div>
  )
}

SvgTexturesEnabled.storyName = "SVG Textures (Enabled)"

export const SvgTexturesHighRes = () => {
  const circuitJson = createTestCircuit()

  return (
    <div style={{ width: "100%", height: "500px", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "8px 12px",
          borderRadius: 4,
          fontSize: 12,
          zIndex: 100,
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 4 }}>
          SVG Textures: High Resolution (300 PPI)
        </div>
        <div style={{ fontSize: 10, opacity: 0.8 }}>
          Sharp details at close zoom
        </div>
      </div>
      <CadViewer circuitJson={circuitJson} />
    </div>
  )
}

SvgTexturesHighRes.storyName = "SVG Textures (High Resolution)"

export default {
  title: "SVG Board Textures",
  component: SvgTexturesDisabled,
}
