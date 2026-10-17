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

const { CameraControllerProvider, useCameraController } = await import(
  "../src/contexts/CameraControllerContext"
)
const { OrientationCubeCanvas, getPresetForCubeFaceNormal } = await import(
  "../src/three-components/OrientationCubeCanvas"
)

test("keeps one orientation canvas after a StrictMode effect replay", async () => {
  const dom = new JSDOM('<div id="root"></div>')
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
      IntersectionObserver: previousIntersectionObserver,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})

test("selecting faces on the orientation cube updates camera orientation to the corresponding preset", async () => {
  expect(getPresetForCubeFaceNormal(new THREE.Vector3(0, 0, 1))).toBe("Front")
  expect(getPresetForCubeFaceNormal(new THREE.Vector3(0, 0, -1))).toBe("Back")
  expect(getPresetForCubeFaceNormal(new THREE.Vector3(1, 0, 0))).toBe(
    "Right Sideview",
  )
  expect(getPresetForCubeFaceNormal(new THREE.Vector3(-1, 0, 0))).toBe(
    "Left Sideview",
  )
  expect(getPresetForCubeFaceNormal(new THREE.Vector3(0, 1, 0))).toBe(
    "Top Down",
  )
  expect(getPresetForCubeFaceNormal(new THREE.Vector3(0, -1, 0))).toBe("Bottom")

  const dom = new JSDOM('<div id="root"></div>')
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

  const mainCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
  mainCamera.up.set(0, 0, 1)
  mainCamera.position.set(5, 0, 0)
  mainCamera.lookAt(0, 0, 0)
  mainCamera.updateMatrixWorld()

  const animatedPresets: string[] = []
  let userInteractions = 0

  const Harness = () => {
    const { mainCameraRef, setController } = useCameraController()
    mainCameraRef.current = mainCamera
    return (
      <>
        <button
          type="button"
          id="bind-controller"
          onClick={() =>
            setController({
              animateTo: () => {},
              animateToPreset: (preset) => {
                animatedPresets.push(preset)
              },
            })
          }
        />
        <OrientationCubeCanvas
          onUserInteraction={() => {
            userInteractions++
          }}
        />
      </>
    )
  }

  const container = document.getElementById("root")!
  const reactRoot = createRoot(container)

  try {
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <Harness />
        </CameraControllerProvider>,
      )
    })

    const canvas = container.querySelector("canvas")!
    canvas.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 120,
        height: 120,
        right: 120,
        bottom: 120,
        x: 0,
        y: 0,
        toJSON: () => {},
      }) as DOMRect

    await act(async () => {
      canvas.dispatchEvent(
        new dom.window.MouseEvent("mousemove", {
          clientX: 60,
          clientY: 60,
          bubbles: true,
        }),
      )
    })
    expect(canvas.style.cursor).toBe("pointer")

    await act(async () => {
      document
        .getElementById("bind-controller")!
        .dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }))
    })

    await act(async () => {
      canvas.dispatchEvent(
        new dom.window.MouseEvent("click", {
          clientX: 60,
          clientY: 60,
          bubbles: true,
        }),
      )
    })

    expect(userInteractions).toBe(1)
    expect(animatedPresets).toEqual(["Right Sideview"])
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
