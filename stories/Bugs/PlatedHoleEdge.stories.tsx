import { CadViewer } from "src/CadViewer"
import type { Meta, StoryObj } from "@storybook/react"

const meta = {
  title: "Bugs/Plated Hole Edge Clip",
  component: CadViewer,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CadViewer>

export default meta

type Story = StoryObj<typeof meta>

const boardWithEdgePlatedHole = [
  {
    type: "pcb_board",
    pcb_board_id: "edge-board",
    thickness: 1.6,
    num_layers: 2,
    center: { x: 0, y: 0 },
    width: 20,
    height: 12,
    material: "fr4",
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "edge-hole",
    x: 10,
    y: 0,
    shape: "pill",
    hole_width: 1.2,
    hole_height: 1.2,
    outer_width: 4,
    outer_height: 3,
    layers: ["top", "bottom"],
  },
] as const

export const PlatedHoleTrimmedAtBoardEdge: Story = {
  args: {
    circuitJson: boardWithEdgePlatedHole as any,
  },
}
