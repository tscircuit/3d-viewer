import type { Meta, StoryObj } from "@storybook/react"
import { CadViewer } from "../src/CadViewer"

const meta = {
  title: "PCB/Pill Hole with Rect Pad",
  component: CadViewer,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CadViewer>

export default meta
type Story = StoryObj<typeof meta>

export const PillHoleWithRectPadDemo: Story = {
  args: {
    circuitJson: [
      {
        type: "pcb_board",
        pcb_board_id: "board_pill_rect",
        thickness: 1.6,
        num_layers: 2,
        center: { x: 0, y: 0 },
        width: 20,
        height: 20,
        material: "fr4",
      },
      {
        type: "pcb_plated_hole",
        shape: "pill_hole_with_rect_pad",
        hole_shape: "pill",
        pad_shape: "rect",
        hole_width: 3.2,
        hole_height: 1.6,
        rect_pad_width: 4.5,
        rect_pad_height: 2.4,
        hole_offset_x: 0.5,
        hole_offset_y: 0,
        rect_border_radius: 0.6,
        x: 4,
        y: 4,
        layers: ["top", "bottom"],
        pcb_plated_hole_id: "ph-pill-horizontal",
      },
      {
        type: "pcb_plated_hole",
        shape: "pill_hole_with_rect_pad",
        hole_shape: "pill",
        pad_shape: "rect",
        hole_width: 1.6,
        hole_height: 3.2,
        rect_pad_width: 2.4,
        rect_pad_height: 4.5,
        hole_offset_x: 0,
        hole_offset_y: 0.3,
        rect_border_radius: 0.6,
        x: -1,
        y: -1,
        layers: ["top", "bottom"],
        pcb_plated_hole_id: "ph-pill-vertical",
      },
    ],
  },
}
