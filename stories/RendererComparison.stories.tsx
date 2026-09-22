import type { Meta, StoryObj } from "@storybook/react-vite"
import { comparisonCases } from "../tests/fixtures/renderer-parity/cases"
import { RendererComparison } from "./renderer-comparison/RendererComparison"

const meta = {
  title: "Diagnostics/Renderer Parity",
  component: RendererComparison,
  parameters: { layout: "fullscreen" },
  argTypes: {
    caseId: { control: "select", options: comparisonCases.map(({ id }) => id) },
  },
} satisfies Meta<typeof RendererComparison>

export default meta
type Story = StoryObj<typeof meta>

export const XRotation: Story = { args: { caseId: "clip-x37-explicit-origin" } }
export const ZeroControl: Story = {
  args: { caseId: "clip-zero-explicit-origin" },
}
export const ZControl: Story = { args: { caseId: "clip-z47-explicit-origin" } }
export const YRotation: Story = { args: { caseId: "clip-y30-explicit-origin" } }
export const MixedRotation: Story = {
  args: { caseId: "clip-mixed-explicit-origin" },
}
export const MissingOrigin: Story = {
  args: { caseId: "clip-zero-inferred-origin" },
}
export const GltfRotation: Story = { args: { caseId: "clip-gltf-x37" } }
export const GltfModelOrigin: Story = {
  args: { caseId: "clip-gltf-nonzero-origin" },
}
export const ImplicitBottomLayer: Story = {
  args: { caseId: "clip-gltf-implicit-bottom" },
}
export const BinaryGlbViaGltf: Story = { args: { caseId: "clip-glb-via-gltf" } }
export const UsbMounted: Story = { args: { caseId: "usb-mounted" } }
export const UsbMissingOrigin: Story = { args: { caseId: "usb-zero" } }
export const Calibration: Story = { args: { caseId: "calibration" } }
