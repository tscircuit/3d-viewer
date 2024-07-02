import React from "react"
import type { Preview } from "@storybook/react"
import { StoryFn } from "@storybook/react"

const withContainer = (Story: StoryFn) => (
  <div style={{ width: "100vw", height: "100vh" }}>
    <Story />
  </div>
)

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [withContainer],
}

export default preview
