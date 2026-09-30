import type { Meta, StoryObj } from "@storybook/react-vite"
import { RendererComparison } from "./renderer-comparison/RendererComparison"

const meta = {
  title: "Renderer Parity/M2 Daughtercard Prototype",
  component: RendererComparison,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RendererComparison>

export default meta
type Story = StoryObj<typeof meta>

export const Upright: Story = {
  args: {
    caseId: "m2-daughtercard",
    manifestUrl: "/renderer-comparison/generated/m2-manifest.json",
  },
}
