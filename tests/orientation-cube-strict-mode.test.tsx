import { expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import { StrictMode, act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"

class MockWebGLRenderer {
  setSize() {}
  setPixelRatio() {}
  render() {}
  dispose() {}
  forceContextLoss() {}
}

class MockText extends THREE.Object3D {
  text = ""
  color = ""
  fontSize = 0
  anchorX = ""
  anchorY = ""
  depthOffset = 0
  font: string | null = null

  sync() {}
  dispose() {}
}

mock.module("three", () => ({
  ...THREE,
  WebGLRenderer: MockWebGLRenderer,
}))
mock.module("troika-three-text", () => ({ Text: MockText }))

const { CameraControllerProvider } = await import(
  "../src/contexts/CameraControllerContext"
)
const { OrientationCubeCanvas } = await import(
  "../src/three-components/OrientationCubeCanvas"
)

test("keeps one orientation canvas after a StrictMode effect replay", async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame
  let animationFrameId = 0

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    requestAnimationFrame: () => ++animationFrameId,
    cancelAnimationFrame: () => {},
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const container = document.getElementById("root")!
  const reactRoot = createRoot(container)

  try {
    await act(async () => {
      reactRoot.render(
        <StrictMode>
          <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
            <OrientationCubeCanvas />
          </CameraControllerProvider>
        </StrictMode>,
      )
    })

    expect(container.querySelectorAll("canvas")).toHaveLength(1)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      requestAnimationFrame: previousRequestAnimationFrame,
      cancelAnimationFrame: previousCancelAnimationFrame,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
