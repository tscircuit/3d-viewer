import type { Meta, StoryObj } from "@storybook/react-vite"
import { comparisonCases } from "../tests/fixtures/renderer-parity/cases"
import { RendererComparison } from "./renderer-comparison/RendererComparison"

const meta = {
  title: "Diagnostics/Renderer Parity",
  component: RendererComparison,
  parameters: { layout: "fullscreen" },
  argTypes: {
    caseId: {
      control: "select",
      options: comparisonCases
        .filter((entry) => entry.id !== "calibration")
        .map(({ id }) => id),
    },
  },
} satisfies Meta<typeof RendererComparison>

export default meta
type Story = StoryObj<typeof meta>

export const XRotation: Story = {
  name: "TO-92: mounting correction about X",
  args: { caseId: "to92-x-mounting" },
}
export const YRotation: Story = {
  name: "TO-92: mounting correction about Y",
  args: { caseId: "to92-y-mounting" },
}
export const MixedRotation: Story = {
  name: "TO-92: composing X and Y corrections",
  args: { caseId: "to92-xy-mounting" },
}
export const StepMissingOrigin: Story = {
  name: "TO-92 STEP: original missing origin",
  args: { caseId: "to92-native-origin" },
}
export const FlashlightMissingOrigins: Story = {
  name: "USB-C flashlight: original missing origins",
  args: { caseId: "flashlight-native-origins" },
}
