import type { Meta, StoryObj } from "@storybook/react"
import { CadViewer } from "../../src/CadViewer"
import { rectangularFlexFloat32Boundary } from "../fixtures/rectangular-flex-float32-boundary"

export default {
  title: "Bugs/Rectangular Flex Float32 Boundary",
  component: CadViewer,
  parameters: { layout: "fullscreen" },
  args: { foldPcbs: true, autoRotateDisabled: true },
} satisfies Meta<typeof CadViewer>

type Story = StoryObj<typeof CadViewer>

// Currently errors even though the axis spans the complete 8.6 mm board.
export const ExactEdgeAxes: Story = {
  args: { circuitJson: rectangularFlexFloat32Boundary() },
}

// Identical board and fold; only the axis endpoints extend beyond the edges.
export const PaddedAxesWorkaround: Story = {
  args: { circuitJson: rectangularFlexFloat32Boundary(0.05) },
}
