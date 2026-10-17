import { expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { zIndexMap } from "../lib/utils/z-index-map"

class MockWebGLRenderer {
  domElement = {
    style: {},
    addEventListener() {},
    removeEventListener() {},
  }
  shadowMap = { enabled: false, type: THREE.PCFSoftShadowMap }
  setSize() {}
  setPixelRatio() {}
  setClearColor() {}
  setClearAlpha() {}
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
mock.module("../src/react-three/Canvas", () => ({
  Canvas: () => <div data-testid="mock-main-canvas" />,
}))
mock.module("../src/react-three/OrbitControls", () => ({
  OrbitControls: () => null,
}))
mock.module("../src/react-three/Lights", () => ({
  Lights: () => null,
}))
mock.module("../src/react-three/Grid", () => ({
  Grid: () => null,
}))

const { AppearanceProvider } = await import(
  "../src/contexts/appearance-context"
)
const { CameraControllerProvider } = await import(
  "../src/contexts/CameraControllerContext"
)
const { CadViewerContainer } = await import("../src/CadViewerContainer")

test("CadViewerContainer hides OrientationCubeCanvas when gizmoCubeDisabled is true", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" })
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame
  const previousIntersectionObserver = globalThis.IntersectionObserver
  let animationFrameId = 0

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    requestAnimationFrame: () => ++animationFrameId,
    cancelAnimationFrame: () => {},
    IntersectionObserver: class {
      observe() {}
      disconnect() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const container = document.getElementById("root")!
  const reactRoot = createRoot(container)

  try {
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <AppearanceProvider>
            <CadViewerContainer />
          </AppearanceProvider>
        </CameraControllerProvider>,
      )
    })

    const hasGizmoCube = () =>
      Array.from(container.querySelectorAll("div")).some(
        (el) => el.style.zIndex === String(zIndexMap.orientationCube),
      )

    expect(hasGizmoCube()).toBe(true)

    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <AppearanceProvider>
            <CadViewerContainer gizmoCubeDisabled />
          </AppearanceProvider>
        </CameraControllerProvider>,
      )
    })

    expect(hasGizmoCube()).toBe(false)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      requestAnimationFrame: previousRequestAnimationFrame,
      cancelAnimationFrame: previousCancelAnimationFrame,
      IntersectionObserver: previousIntersectionObserver,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
