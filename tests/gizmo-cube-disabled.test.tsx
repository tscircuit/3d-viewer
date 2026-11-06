import type { AnyCircuitElement } from "circuit-json"
import { expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg"
import { applyJsdomShim } from "../src/utils/jsdom-shim"
import circuitJson from "./assets/capacitor-resistor-default-circuit.json"

class MockWebGLRenderer {
  domElement = globalThis.document?.createElement?.("canvas") ?? ({} as any)
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

test("gizmoCubeDisabled hides the OrientationCubeCanvas in CadViewerContainer", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://3d-viewer.test",
  })
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    sessionStorage: globalThis.sessionStorage,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    ResizeObserver: globalThis.ResizeObserver,
    IntersectionObserver: globalThis.IntersectionObserver,
  }
  let animationFrameId = 0

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
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

  try {
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <AppearanceProvider>
            <SectionProvider>
              <CadViewerContainer autoRotateDisabled />
            </SectionProvider>
          </AppearanceProvider>
        </CameraControllerProvider>,
      )
    })

    expect(container.querySelectorAll("canvas")).toHaveLength(2)

    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <AppearanceProvider>
            <SectionProvider>
              <CadViewerContainer autoRotateDisabled gizmoCubeDisabled />
            </SectionProvider>
          </AppearanceProvider>
        </CameraControllerProvider>,
      )
    })

    expect(container.querySelectorAll("canvas")).toHaveLength(1)

    applyJsdomShim(dom)
    const svg = await convertCircuitJsonTo3dSvg(
      circuitJson as AnyCircuitElement[],
      {
        width: 800,
        height: 600,
        backgroundColor: "#ffffff",
        padding: 20,
        zoom: 9,
        viewAngle: "top",
        camera: {
          position: { x: 40, y: -40, z: 60 },
          lookAt: { x: 0, y: 0, z: 0 },
        },
      },
    )
    expect(svg).toMatchSvgSnapshot(import.meta.path)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      ...previousGlobals,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
