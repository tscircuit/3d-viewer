import { expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"

class MockWebGLRenderer {
  domElement = globalThis.document
    ? globalThis.document.createElement("canvas")
    : ({ style: {} } as HTMLCanvasElement)
  shadowMap = { enabled: false, type: 0 }
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
const { SchematicNavigationContext } = await import(
  "../src/contexts/SchematicNavigationContext"
)
const { SectionProvider } = await import("../src/sections/SectionContext")
const { CadViewerContainer } = await import("../src/CadViewerContainer")

test("CadViewerContainer hides the orientation gizmo cube when gizmoCubeDisabled is true", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/",
  })
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const previousLocalStorage = globalThis.localStorage
  const previousSessionStorage = globalThis.sessionStorage
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame
  const previousResizeObserver = globalThis.ResizeObserver
  const previousIntersectionObserver = globalThis.IntersectionObserver
  let animationFrameId = 0

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    localStorage: dom.window.localStorage,
    sessionStorage: dom.window.sessionStorage,
    requestAnimationFrame: () => ++animationFrameId,
    cancelAnimationFrame: () => {},
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    IntersectionObserver: class {
      observe() {}
      disconnect() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const container = document.getElementById("root")!
  const reactRoot = createRoot(container)
  const sceneRef = { current: null }

  const renderContainer = (gizmoCubeDisabled?: boolean) => (
    <AppearanceProvider>
      <SectionProvider>
        <SchematicNavigationContext.Provider value={sceneRef}>
          <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
            <CadViewerContainer
              autoRotateDisabled
              gizmoCubeDisabled={gizmoCubeDisabled}
            />
          </CameraControllerProvider>
        </SchematicNavigationContext.Provider>
      </SectionProvider>
    </AppearanceProvider>
  )

  try {
    await act(async () => {
      reactRoot.render(renderContainer(false))
    })
    const canvasesWhenEnabled = container.querySelectorAll("canvas").length
    expect(canvasesWhenEnabled).toBe(2)

    await act(async () => {
      reactRoot.render(renderContainer(true))
    })
    const canvasesWhenDisabled = container.querySelectorAll("canvas").length
    expect(canvasesWhenDisabled).toBe(1)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      localStorage: previousLocalStorage,
      sessionStorage: previousSessionStorage,
      requestAnimationFrame: previousRequestAnimationFrame,
      cancelAnimationFrame: previousCancelAnimationFrame,
      ResizeObserver: previousResizeObserver,
      IntersectionObserver: previousIntersectionObserver,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
