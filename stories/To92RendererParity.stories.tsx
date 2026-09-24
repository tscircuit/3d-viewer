import type { Meta, StoryObj } from "@storybook/react-vite"
import { RendererComparison } from "./renderer-comparison/RendererComparison"

const meta = {
  title: "Renderer Parity/TO-92",
  component: RendererComparison,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RendererComparison>

export default meta
type Story = StoryObj<typeof meta>

export const StepMissingOrigin: Story = {
  name: "TO-92 STEP: original missing origin",
  args: { caseId: "to92-native-origin" },
}
