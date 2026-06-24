import { test, expect } from "bun:test"
import { JSDOM } from "jsdom"
import { removeExistingCanvases } from "../src/react-three/remove-existing-canvases"

test("removeExistingCanvases removes all canvases", () => {
  const dom = new JSDOM()
  const container = dom.window.document.createElement("div")
  for (let i = 0; i < 3; i++) {
    container.appendChild(dom.window.document.createElement("canvas"))
  }
  removeExistingCanvases(container as unknown as HTMLElement)
  expect(container.querySelectorAll("canvas")).toHaveLength(0)
})
