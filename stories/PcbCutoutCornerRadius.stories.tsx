import { CadViewer } from "../src/CadViewer"
import type { Meta, StoryObj } from "@storybook/react"

const meta = {
  title: "PCB/Cutout Corner Radius",
  component: CadViewer,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CadViewer>

export default meta

type Story = StoryObj<typeof meta>

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_0",
    center: { x: 0, y: 0 },
    width: 30,
    height: 30,
    material: "fr1",
    num_layers: 2,
    thickness: 1.2,
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_rect_rounded_0",
    shape: "rect",
    center: { x: -8, y: 8 },
    width: 8,
    height: 5,
    corner_radius: 2.5,
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_rect_sharp_0",
    shape: "rect",
    center: { x: 8, y: 8 },
    width: 8,
    height: 5,
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_rect_rounded_rotated",
    shape: "rect",
    center: { x: 0, y: -8 },
    width: 10,
    height: 4,
    corner_radius: 0.8,
    rotation: 45,
  },
]

export const RoundedAndSharpCutouts: Story = {
  args: {
    circuitJson,
  },
}
