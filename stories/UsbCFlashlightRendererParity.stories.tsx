import type { Meta, StoryObj } from "@storybook/react-vite"
import { RendererComparison } from "./renderer-comparison/RendererComparison"

const meta = {
  title: "Renderer Parity/USB-C Flashlight",
  component: RendererComparison,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RendererComparison>

export default meta
type Story = StoryObj<typeof meta>

export const FlashlightMissingOrigins: Story = {
  name: "USB-C flashlight: original missing origins",
  args: { caseId: "flashlight-native-origins" },
}
