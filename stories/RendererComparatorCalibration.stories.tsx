import type { Meta, StoryObj } from "@storybook/react-vite"
import { RendererComparison } from "./renderer-comparison/RendererComparison"

const meta = {
  title: "Diagnostics/Renderer Comparator Calibration",
  component: RendererComparison,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RendererComparison>

export default meta
type Story = StoryObj<typeof meta>

export const IdenticalViewerCopies: Story = { args: { caseId: "calibration" } }
