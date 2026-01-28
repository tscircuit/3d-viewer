import type { Meta, StoryObj } from "@storybook/react"
import { CadViewer } from "../src/CadViewer"
import circuitJson from "./assets/keyboard-default60.json"

const meta: Meta<typeof CadViewer> = {
  title: "WebGPU Renderer",
  component: CadViewer,
}

export default meta
type Story = StoryObj<typeof CadViewer>

export const WithWebGPU: Story = {
  args: {
    circuitJson: circuitJson as any,
    useWebGPU: true,
  },
  render: (args) => (
    <div style={{ width: "100%", height: "500px" }}>
      <CadViewer {...args} />
    </div>
  ),
}

export const WithWebGL: Story = {
  args: {
    circuitJson: circuitJson as any,
    useWebGPU: false,
  },
  render: (args) => (
    <div style={{ width: "100%", height: "500px" }}>
      <CadViewer {...args} />
    </div>
  ),
}
