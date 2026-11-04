import { expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import { useEffect } from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import type { CameraAnimationConfig } from "../src/hooks/cameraAnimation"

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
mock.module("troika-three-text", () => ({
  Text: MockText,
  configureTextBuilder: () => {},
}))

const { CameraControllerProvider, useCameraController } = await import(
  "../src/contexts/CameraControllerContext"
)
const { OrientationCubeCanvas } = await import(
  "../src/three-components/OrientationCubeCanvas"
)

test("clicking an orientation cube face animates camera to face view", async () => {
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

  const animatedConfigs: CameraAnimationConfig[] = []
  let userInteractions = 0

  const CameraSetup = () => {
    const { mainCameraRef, setController } = useCameraController()
    useEffect(() => {
      const cam = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
      cam.up.set(0, 0, 1)
      // Camera looking from Front (0, -10, 0) toward origin (0, 0, 0) -> rotation (pi/2, 0, 0)
      cam.position.set(0, -10, 0)
      cam.rotation.set(Math.PI / 2, 0, 0)
      mainCameraRef.current = cam
      setController({
        animateTo: (config) => {
          animatedConfigs.push(config)
        },
        animateToPreset: () => {},
      })
    }, [mainCameraRef, setController])
    return null
  }

  const container = document.getElementById("root")!
  const reactRoot = createRoot(container)

  try {
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3(0, 0, 0)}>
          <CameraSetup />
          <OrientationCubeCanvas
            onUserInteraction={() => {
              userInteractions++
            }}
          />
        </CameraControllerProvider>,
      )
    })

    const canvas = container.querySelector("canvas")!
    expect(canvas).not.toBeNull()
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

    // Hover center of canvas (hits the visible cube face)
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

    // Click center of canvas
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
    expect(animatedConfigs).toHaveLength(1)
    expect(animatedConfigs[0]?.target).toEqual([0, 0, 0])
    expect(animatedConfigs[0]?.up).toEqual([0, 0, 1])
    // Distance is 10, hitting theTop/Front face aligned with camera axis
    const [px, py, pz] = animatedConfigs[0]!.position
    expect(Math.hypot(px, py, pz)).toBeCloseTo(10, 5)
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
