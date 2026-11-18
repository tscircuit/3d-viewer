import { expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"

const renderedScenes: THREE.Scene[] = []
const renderedCameras: THREE.Camera[] = []

class MockWebGLRenderer {
  setSize() {}
  setPixelRatio() {}
  render(scene: THREE.Scene, camera: THREE.Camera) {
    renderedScenes.push(scene)
    renderedCameras.push(camera)
  }
  dispose() {}
  forceContextLoss() {}
}

class MockText extends THREE.Mesh {
  text = ""
  color: THREE.ColorRepresentation = ""
  fontSize = 0
  anchorX: number | "left" | "center" | "right" = "center"
  anchorY:
    | number
    | "top"
    | "top-baseline"
    | "top-cap"
    | "top-ex"
    | "middle"
    | "bottom-baseline"
    | "bottom" = "middle"
  depthOffset = 0
  font: string | null = null
  disposed = false

  sync() {}
  dispose() {
    this.disposed = true
  }
}

mock.module("three", () => ({
  ...THREE,
  WebGLRenderer: MockWebGLRenderer,
}))
mock.module("troika-three-text", () => ({
  Text: MockText,
  configureTextBuilder: () => {},
}))

const { ORIENTATION_AXIS_DEFINITIONS, createOrientationCubeAxes } =
  await import("../src/three-components/orientation-cube-axes")
const { CameraControllerProvider } = await import(
  "../src/contexts/CameraControllerContext"
)
const { OrientationCubeCanvas } = await import(
  "../src/three-components/OrientationCubeCanvas"
)

test("createOrientationCubeAxes builds world-aligned RGB +X/+Y/+Z arrows and camera-facing labels", () => {
  const axes = createOrientationCubeAxes()
  axes.group.updateMatrixWorld(true)

  expect(ORIENTATION_AXIS_DEFINITIONS.map((d) => d.label)).toEqual([
    "X",
    "Y",
    "Z",
  ])
  expect(ORIENTATION_AXIS_DEFINITIONS.map((d) => d.color)).toEqual([
    0xef4444, 0x22c55e, 0x3b82f6,
  ])

  const expectedVectors: Record<"x" | "y" | "z", THREE.Vector3> = {
    x: new THREE.Vector3(1, 0, 0),
    y: new THREE.Vector3(0, 1, 0),
    z: new THREE.Vector3(0, 0, 1),
  }

  for (const axis of ["x", "y", "z"] as const) {
    const arrowGroup = axes.arrows[axis]
    const headMesh = arrowGroup.getObjectByName(
      `orientation-axis-head-${axis}`,
    ) as THREE.Mesh
    expect(headMesh).toBeDefined()

    const originWorld = new THREE.Vector3()
    arrowGroup.getWorldPosition(originWorld)

    const headWorld = new THREE.Vector3()
    headMesh.getWorldPosition(headWorld)

    const direction = headWorld.clone().sub(originWorld).normalize()
    expect(direction.x).toBeCloseTo(expectedVectors[axis].x, 6)
    expect(direction.y).toBeCloseTo(expectedVectors[axis].y, 6)
    expect(direction.z).toBeCloseTo(expectedVectors[axis].z, 6)

    // Arrowhead and tip label extend clearly past the [-0.5, 0.5] cube bounds
    expect(headWorld[axis]).toBeGreaterThan(0.5)

    const label = axes.labels[axis]
    expect(label.text).toBe(axis.toUpperCase())
    expect(label.position[axis]).toBeGreaterThan(headWorld[axis])
  }

  const testCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 100)
  testCamera.position.set(3, -4, 5)
  testCamera.up.set(0, 0, 1)
  testCamera.lookAt(0, 0, 0)
  testCamera.updateMatrixWorld(true)

  axes.syncToCamera(testCamera)
  for (const axis of ["x", "y", "z"] as const) {
    expect(axes.labels[axis].quaternion.x).toBeCloseTo(
      testCamera.quaternion.x,
      6,
    )
    expect(axes.labels[axis].quaternion.y).toBeCloseTo(
      testCamera.quaternion.y,
      6,
    )
    expect(axes.labels[axis].quaternion.z).toBeCloseTo(
      testCamera.quaternion.z,
      6,
    )
    expect(axes.labels[axis].quaternion.w).toBeCloseTo(
      testCamera.quaternion.w,
      6,
    )
  }

  axes.dispose()
  for (const axis of ["x", "y", "z"] as const) {
    expect((axes.labels[axis] as unknown as MockText).disposed).toBe(true)
  }
})

test("OrientationCubeCanvas attaches X/Y/Z axis triad in scene world coordinates aligned with Right/Back/Top faces", async () => {
  renderedScenes.length = 0
  renderedCameras.length = 0

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
  let axesGroup: THREE.Object3D | undefined

  try {
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <OrientationCubeCanvas />
        </CameraControllerProvider>,
      )
    })

    expect(renderedScenes.length).toBeGreaterThan(0)
    const scene = renderedScenes[renderedScenes.length - 1]!
    scene.updateMatrixWorld(true)

    // Axes group must be a direct child of scene (not rotated by the cube face group's Rx(pi/2))
    axesGroup = scene.getObjectByName("orientation-cube-axes")
    expect(axesGroup).toBeDefined()
    expect(axesGroup?.parent).toBe(scene)
    expect(axesGroup?.rotation.x).toBe(0)
    expect(axesGroup?.rotation.y).toBe(0)
    expect(axesGroup?.rotation.z).toBe(0)

    // Verify face labels in world space align with +X (Right), +Y (Back), +Z (Top)
    const faceTexts: Record<string, THREE.Vector3> = {}
    scene.traverse((obj) => {
      if (
        obj instanceof MockText &&
        ["Right", "Back", "Top"].includes(obj.text)
      ) {
        const worldPos = new THREE.Vector3()
        obj.getWorldPosition(worldPos)
        faceTexts[obj.text] = worldPos
      }
    })

    expect(faceTexts.Right!.x).toBeGreaterThan(0.5)
    expect(Math.abs(faceTexts.Right!.y)).toBeLessThan(1e-6)
    expect(Math.abs(faceTexts.Right!.z)).toBeLessThan(1e-6)

    expect(faceTexts.Back!.y).toBeGreaterThan(0.5)
    expect(Math.abs(faceTexts.Back!.x)).toBeLessThan(1e-6)
    expect(Math.abs(faceTexts.Back!.z)).toBeLessThan(1e-6)

    expect(faceTexts.Top!.z).toBeGreaterThan(0.5)
    expect(Math.abs(faceTexts.Top!.x)).toBeLessThan(1e-6)
    expect(Math.abs(faceTexts.Top!.y)).toBeLessThan(1e-6)
  } finally {
    await act(async () => reactRoot.unmount())
    if (axesGroup) {
      for (const axis of ["x", "y", "z"] as const) {
        const label = axesGroup.getObjectByName(
          `orientation-axis-label-${axis}`,
        ) as MockText | undefined
        expect(label?.disposed).toBe(true)
      }
    }
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
