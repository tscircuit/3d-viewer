import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const renderedGltfUrls: string[] = []
const gltfModelMock = () => ({
  GltfModel: ({ gltfUrl }: { gltfUrl: string }) => {
    renderedGltfUrls.push(gltfUrl)
    return React.createElement("span", { "data-testid": "gltf-url" }, gltfUrl)
  },
})

mock.module("../src/three-components/GltfModel", gltfModelMock)
mock.module("../src/three-components/GltfModel.tsx", gltfModelMock)

const { StepModel } = await import("../src/three-components/StepModel")

let dom: JSDOM
let container: HTMLElement
let root: Root
let originalFetch: typeof globalThis.fetch
let originalCreateObjectUrl: typeof URL.createObjectURL | undefined
let originalRevokeObjectUrl: typeof URL.revokeObjectURL | undefined

function renderStepModel(stepUrl: string) {
  root.render(
    <StepModel
      stepUrl={stepUrl}
      onHover={() => {}}
      onUnhover={() => {}}
      isHovered={false}
    />,
  )
}

beforeEach(() => {
  dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "https://example.test",
  })
  container = dom.window.document.getElementById("root")!
  root = createRoot(container)
  renderedGltfUrls.length = 0
  ;(
    globalThis as { stepUrlToGltfModelConversions?: unknown }
  ).stepUrlToGltfModelConversions = undefined

  Object.defineProperty(globalThis, "window", {
    value: dom.window,
    configurable: true,
  })
  Object.defineProperty(globalThis, "document", {
    value: dom.window.document,
    configurable: true,
  })
  Object.defineProperty(globalThis, "localStorage", {
    value: dom.window.localStorage,
    configurable: true,
  })
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  })

  originalFetch = globalThis.fetch
  globalThis.fetch = (() => new Promise<Response>(() => {})) as typeof fetch

  originalCreateObjectUrl = URL.createObjectURL
  originalRevokeObjectUrl = URL.revokeObjectURL

  let objectUrlCount = 0
  URL.createObjectURL = mock(() => {
    objectUrlCount += 1
    return `blob:step-${objectUrlCount}`
  })
  URL.revokeObjectURL = mock(() => {})
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  globalThis.fetch = originalFetch
  if (originalCreateObjectUrl) {
    URL.createObjectURL = originalCreateObjectUrl
  }
  if (originalRevokeObjectUrl) {
    URL.revokeObjectURL = originalRevokeObjectUrl
  }
  dom.window.close()
})

test("clears the previous converted STEP model while a new STEP URL is pending", async () => {
  localStorage.setItem("step-glb-cache:first.step", "AQID")

  await act(async () => {
    renderStepModel("first.step")
    await Promise.resolve()
  })

  expect(container.textContent).toBe("blob:step-1")

  await act(async () => {
    renderStepModel("second.step")
    await Promise.resolve()
  })

  expect(container.textContent).toBe("")
  expect(renderedGltfUrls).toContain("blob:step-1")
})
