import { CadViewer } from "../src/CadViewer"
import type { Meta, StoryObj } from "@storybook/react"

const meta = {
  title: "PCB/Pill Non-Plated Holes",
  component: CadViewer,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CadViewer>

export default meta
type Story = StoryObj<typeof meta>

export const PillNonPlatedHoles: Story = {
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
      // Horizontal pill hole (no rotation) - uses "pill" shape
      {
        type: "pcb_hole",
        pcb_hole_id: "hole_horizontal",
        x: -5,
        y: 5,
        hole_shape: "pill",
        hole_width: 4,
        hole_height: 2,
      },
      // Vertical pill hole (no rotation) - uses "pill" shape
      {
        type: "pcb_hole",
        pcb_hole_id: "hole_vertical",
        x: 5,
        y: 5,
        hole_shape: "pill",
        hole_width: 2,
        hole_height: 4,
      },
      // Rotated pill hole (45 degrees) - uses "rotated_pill" shape
      {
        type: "pcb_hole",
        pcb_hole_id: "hole_rotated_45",
        x: -5,
        y: -5,
        hole_shape: "rotated_pill",
        hole_width: 4,
        hole_height: 2,
        ccw_rotation: 45,
      },
      // Rotated pill hole (90 degrees) - uses "rotated_pill" shape
      {
        type: "pcb_hole",
        pcb_hole_id: "hole_rotated_90",
        x: 5,
        y: -5,
        hole_shape: "rotated_pill",
        hole_width: 4,
        hole_height: 2,
        ccw_rotation: 90,
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
