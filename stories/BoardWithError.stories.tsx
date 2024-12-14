import { CadViewer } from "../src"
import type { Meta, StoryObj } from "@storybook/react"

const meta = {
  title: "Board With Error",
  component: CadViewer,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CadViewer>

export default meta
type Story = StoryObj<typeof meta>

export const BoardWithError: Story = {
  args: {
    soup: [
      {
        type: "pcb_board",
        center: { x: 0, y: 0 },
        width: 10,
        height: 10,
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
      {
        type: "cad_component",
        cad_component_id: "some-id-3",
        pcb_component_id: "some-id-3",
        source_component_id: "some-id-3",
        position: { x: 2, y: 3, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        model_jscad: {
          type: "box",
          size: [1, 1, 1],
        },
      },
    ],
  },
}
