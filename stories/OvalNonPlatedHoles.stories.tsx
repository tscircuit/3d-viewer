import type { Meta, StoryObj } from "@storybook/react"
import { CadViewer } from "../src/CadViewer"

const meta = {
  title: "PCB/Oval Non-Plated Holes",
  component: CadViewer,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CadViewer>

export default meta
type Story = StoryObj<typeof meta>

export const OvalNonPlatedHoles: Story = {
  args: {
    circuitJson: [
      {
        type: "pcb_board",
        pcb_board_id: "board_1",
        thickness: 1.6,
        num_layers: 2,
        center: { x: 0, y: 0 },
        width: 20,
        height: 20,
        material: "fr4",
      },
      // Horizontal oval hole (wider than tall)
      {
        type: "pcb_hole",
        pcb_hole_id: "hole_horizontal_oval",
        x: -6,
        y: 6,
        hole_shape: "oval",
        hole_width: 4,
        hole_height: 2,
      },
      // Vertical oval hole (taller than wide)
      {
        type: "pcb_hole",
        pcb_hole_id: "hole_vertical_oval",
        x: 6,
        y: 6,
        hole_shape: "oval",
        hole_width: 2,
        hole_height: 4,
      },
      // Wide oval hole
      {
        type: "pcb_hole",
        pcb_hole_id: "hole_wide_oval",
        x: -6,
        y: 0,
        hole_shape: "oval",
        hole_width: 6,
        hole_height: 1.5,
      },
      // Tall oval hole
      {
        type: "pcb_hole",
        pcb_hole_id: "hole_tall_oval",
        x: 6,
        y: 0,
        hole_shape: "oval",
        hole_width: 1.5,
        hole_height: 6,
      },
      // Square oval hole (equal width and height)
      {
        type: "pcb_hole",
        pcb_hole_id: "hole_square_oval",
        x: 0,
        y: -6,
        hole_shape: "oval",
        hole_width: 3,
        hole_height: 3,
      },
      // Small circular reference hole for comparison
      {
        type: "pcb_hole",
        pcb_hole_id: "hole_circle_ref",
        x: 0,
        y: 0,
        hole_shape: "circle",
        hole_diameter: 1,
      },
    ],
  },
}
