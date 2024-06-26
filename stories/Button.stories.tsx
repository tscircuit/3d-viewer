import React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "@storybook/test"

const HelloWorld = () => <h1>Hello World</h1>

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Example/HelloWorld",
  component: HelloWorld,
  args: { onClick: fn() },
} satisfies Meta<typeof HelloWorld>

export default meta

export const Default = () => <HelloWorld />
