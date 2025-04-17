import { CadViewer } from "../src"
import type { Meta, StoryObj } from "@storybook/react"

const meta = {
  title: "PCB/Pill Shaped Hole",
  component: CadViewer,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CadViewer>

export default meta
type Story = StoryObj<typeof meta>

export const MultiplePillHoles: Story = {
  args: {
    circuitJson: [
      {
        type: "pcb_board",
        pcb_board_id: "board_1",
        thickness: 1.6,
        num_layers: 2,
        center: { x: 0, y: 0 },
        width: 10,
        height: 10,
        material: "fr4",
      },
      {
        type: "pcb_plated_hole",
        pcb_plated_hole_id: "some-id-0",
        x: -2,
        y: 0,
        shape: "pill",
        hole_width: 3,
        hole_height: 1,
        outer_width: 4,
        outer_height: 2,
        layers: ["top", "bottom"],
      },
      {
        type: "pcb_plated_hole",
        pcb_plated_hole_id: "some-id-1",
        x: -2,
        y: 3,
        shape: "pill",
        hole_width: 1,
        hole_height: 3,
        outer_width: 2,
        outer_height: 4,
        layers: ["top", "bottom"],
      },
      {
        type: "pcb_plated_hole",
        pcb_plated_hole_id: "some-id-2",
        x: 2,
        y: 0,
        shape: "pill",
        hole_width: 2,
        hole_height: 1.5,
        layers: ["top", "bottom"],
        outer_width: 3,
        outer_height: 3,
      },
    ],
  },
}
