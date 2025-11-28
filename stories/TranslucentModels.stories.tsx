import type { Meta, StoryObj } from "@storybook/react"
import { CadViewer } from "../src/CadViewer"
import type { AnyCircuitElement } from "circuit-json"

const meta: Meta<typeof CadViewer> = {
  title: "Features/Translucent Models",
  component: CadViewer,
  parameters: {
    layout: "fullscreen",
  },
}

export default meta
type Story = StoryObj<typeof CadViewer>

// Sample circuit JSON with components marked as translucent
const sampleCircuitJson: AnyCircuitElement[] = [
  {
    type: "source_component",
    source_component_id: "source_component_0",
    name: "R1",
    ftype: "simple_resistor",
  },
  {
    type: "source_component",
    source_component_id: "source_component_1",
    name: "R2",
    ftype: "simple_resistor",
  },
  {
    type: "source_component",
    source_component_id: "source_component_2",
    name: "C1",
    ftype: "simple_capacitor",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    center: { x: 0, y: 0 },
    layer: "top",
    rotation: 0,
    width: 3,
    height: 1.5,
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_1",
    source_component_id: "source_component_1",
    center: { x: 5, y: 0 },
    layer: "top",
    rotation: 0,
    width: 3,
    height: 1.5,
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_2",
    source_component_id: "source_component_2",
    center: { x: 10, y: 0 },
    layer: "top",
    rotation: 0,
    width: 2,
    height: 2,
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_0",
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    position: { x: 0, y: 0, z: 0.8 },
    rotation: { x: 0, y: 0, z: 0 },
    footprinter_string: "0805",
    show_as_translucent_model: false,
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_1",
    pcb_component_id: "pcb_component_1",
    source_component_id: "source_component_1",
    position: { x: 5, y: 0, z: 0.8 },
    rotation: { x: 0, y: 0, z: 0 },
    footprinter_string: "0805",
    show_as_translucent_model: true, // This component is marked as translucent
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_2",
    pcb_component_id: "pcb_component_2",
    source_component_id: "source_component_2",
    position: { x: 10, y: 0, z: 0.8 },
    rotation: { x: 0, y: 0, z: 0 },
    footprinter_string: "0805",
    show_as_translucent_model: true, // This component is also marked as translucent
  },
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 5, y: 0 },
    width: 15,
    height: 10,
    thickness: 1.6,
  },
]

export const Default: Story = {
  args: {
    circuitJson: sampleCircuitJson,
  },
  parameters: {
    docs: {
      description: {
        story:
          "This story demonstrates the translucent models feature. Press **Shift+V** to toggle visibility of components marked as translucent (R2 and C1 in this example). Regular components (R1) will remain visible.",
      },
    },
  },
}

export const AllTranslucent: Story = {
  args: {
    circuitJson: sampleCircuitJson.map((elm) =>
      elm.type === "cad_component"
        ? { ...elm, show_as_translucent_model: true }
        : elm,
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "All components are marked as translucent. Press **Shift+V** to toggle them all.",
      },
    },
  },
}

export const NoneTranslucent: Story = {
  args: {
    circuitJson: sampleCircuitJson.map((elm) =>
      elm.type === "cad_component"
        ? { ...elm, show_as_translucent_model: false }
        : elm,
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "No components are marked as translucent. The **Shift+V** shortcut won't affect any components.",
      },
    },
  },
}
