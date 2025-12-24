import React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { CadViewer } from "../src/CadViewer"

/**
 * PCB Texture Support Stories
 *
 * Demonstrates the new PCB texture rendering feature using circuit-to-svg and resvg-wasm.
 * This feature converts circuit JSON to SVG and then renders it as PNG textures
 * on the 3D PCB board.
 */
const meta: Meta<typeof CadViewer> = {
  title: "Features/PCB Texture Support",
  component: CadViewer,
  parameters: {
    layout: "fullscreen",
  },
}

export default meta
type Story = StoryObj<typeof CadViewer>

// Simple circuit with a resistor and LED
const simpleCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    center: { x: 0, y: 0 },
    width: 40,
    height: 30,
    thickness: 1.6,
    num_layers: 2,
    outline: [
      { x: -20, y: -15 },
      { x: 20, y: -15 },
      { x: 20, y: 15 },
      { x: -20, y: 15 },
    ],
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_comp_1",
    source_component_id: "source_comp_1",
    center: { x: -8, y: 0 },
    layer: "top",
    rotation: 0,
    width: 3.2,
    height: 1.6,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_1",
    pcb_component_id: "pcb_comp_1",
    shape: "rect",
    x: -9.1,
    y: 0,
    width: 1,
    height: 1.2,
    layer: "top",
    port_hints: ["1"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_2",
    pcb_component_id: "pcb_comp_1",
    shape: "rect",
    x: -6.9,
    y: 0,
    width: 1,
    height: 1.2,
    layer: "top",
    port_hints: ["2"],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_1",
    route: [
      { route_type: "wire", x: -6.9, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: 5, y: 3, width: 0.2, layer: "top" },
    ],
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk_1",
    font: "tscircuit2024",
    font_size: 1.2,
    pcb_component_id: "pcb_comp_1",
    text: "R1",
    anchor_position: { x: -8, y: 2.5 },
    anchor_alignment: "center",
    layer: "top",
  },
]

export const BasicPcbTexture: Story = {
  args: {
    soup: simpleCircuit as any,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Basic PCB with texture rendering using circuit-to-svg and resvg-wasm. Shows a simple resistor with traces and silkscreen text.",
      },
    },
  },
}

// Complex circuit with multiple components
const complexCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "board_2",
    center: { x: 0, y: 0 },
    width: 60,
    height: 40,
    thickness: 1.6,
    num_layers: 4,
    outline: [
      { x: -30, y: -20 },
      { x: 30, y: -20 },
      { x: 30, y: 20 },
      { x: -30, y: 20 },
    ],
  },
  // IC Component
  {
    type: "pcb_component",
    pcb_component_id: "pcb_ic_1",
    source_component_id: "source_ic_1",
    center: { x: 0, y: 0 },
    layer: "top",
    rotation: 0,
    width: 10,
    height: 10,
  },
  // Multiple traces
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_ic_1",
    route: [
      { route_type: "wire", x: -5, y: 2, width: 0.25, layer: "top" },
      { route_type: "wire", x: -15, y: 2, width: 0.25, layer: "top" },
      { route_type: "wire", x: -20, y: 8, width: 0.25, layer: "top" },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_ic_2",
    route: [
      { route_type: "wire", x: 5, y: -2, width: 0.25, layer: "top" },
      { route_type: "wire", x: 15, y: -2, width: 0.25, layer: "top" },
      { route_type: "wire", x: 20, y: -10, width: 0.25, layer: "top" },
    ],
  },
  // Silkscreen labels
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk_ic",
    font: "tscircuit2024",
    font_size: 1.5,
    pcb_component_id: "pcb_ic_1",
    text: "U1",
    anchor_position: { x: 0, y: 7 },
    anchor_alignment: "center",
    layer: "top",
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk_title",
    font: "tscircuit2024",
    font_size: 2,
    text: "PCB TEXTURE DEMO",
    anchor_position: { x: 0, y: -15 },
    anchor_alignment: "center",
    layer: "top",
  },
  // Vias
  {
    type: "pcb_via",
    pcb_via_id: "via_1",
    x: -10,
    y: 5,
    outer_diameter: 0.8,
    hole_diameter: 0.4,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "via_2",
    x: 10,
    y: -5,
    outer_diameter: 0.8,
    hole_diameter: 0.4,
    layers: ["top", "bottom"],
  },
]

export const ComplexPcbTexture: Story = {
  args: {
    soup: complexCircuit as any,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Complex PCB with multiple components, traces, vias, and silkscreen text demonstrating the full texture rendering capabilities.",
      },
    },
  },
}
