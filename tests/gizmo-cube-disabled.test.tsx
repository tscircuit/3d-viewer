import { expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"

class MockWebGLRenderer {
  domElement: HTMLCanvasElement
  shadowMap = { enabled: false, type: 0 }
  constructor(options?: { canvas?: HTMLCanvasElement }) {
    this.domElement = options?.canvas ?? document.createElement("canvas")
  }
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
mock.module("troika-three-text", () => ({
  Text: MockText,
  configureTextBuilder: () => {},
}))

const { AppearanceProvider } = await import(
  "../src/contexts/appearance-context"
)
const { CameraControllerProvider } = await import(
  "../src/contexts/CameraControllerContext"
)
const { SectionProvider } = await import("../src/sections/SectionContext")
const { CadViewerContainer } = await import("../src/CadViewerContainer")

test("gizmoCubeDisabled hides OrientationCubeCanvas when true", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost",
  })
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const previousSessionStorage = globalThis.sessionStorage
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame
  const previousIntersectionObserver = globalThis.IntersectionObserver
  const previousResizeObserver = globalThis.ResizeObserver
  let animationFrameId = 0

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    sessionStorage: dom.window.sessionStorage,
    requestAnimationFrame: () => ++animationFrameId,
    cancelAnimationFrame: () => {},
    IntersectionObserver: class {
      observe() {}
      disconnect() {}
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const container = document.getElementById("root")!
  const reactRoot = createRoot(container)

  const renderContainer = (gizmoCubeDisabled?: boolean) =>
    act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <AppearanceProvider>
            <SectionProvider>
              <CadViewerContainer gizmoCubeDisabled={gizmoCubeDisabled} />
            </SectionProvider>
          </AppearanceProvider>
        </CameraControllerProvider>,
      )
    })

  try {
    await renderContainer(false)
    // Default renders both the OrientationCubeCanvas and main Canvas
    expect(container.querySelectorAll("canvas").length).toBeGreaterThanOrEqual(
      1,
    )
    const defaultCanvasCount = container.querySelectorAll("canvas").length

    await renderContainer(true)
    // With gizmoCubeDisabled=true, OrientationCubeCanvas is omitted (1 fewer canvas)
    expect(container.querySelectorAll("canvas")).toHaveLength(
      defaultCanvasCount - 1,
    )
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      sessionStorage: previousSessionStorage,
      requestAnimationFrame: previousRequestAnimationFrame,
      cancelAnimationFrame: previousCancelAnimationFrame,
      IntersectionObserver: previousIntersectionObserver,
      ResizeObserver: previousResizeObserver,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
