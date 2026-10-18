import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, useEffect } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import {
  CameraControllerProvider,
  useCameraController,
} from "../src/contexts/CameraControllerContext"
import { Grid } from "../src/react-three/Grid"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { getInitialCameraPosition } from "../src/utils/get-initial-camera-position"
import { calculateOutlineBounds } from "../src/utils/outline-bounds"

const splitKeyboardOutline = [
  { x: 48.75, y: -55 },
  { x: -75.25, y: -55 },
  { x: -75.25, y: 60 },
  { x: 86.25, y: 60 },
  { x: 86.25, y: -22.5 },
  { x: 48.75, y: -60 },
]

test("Grid scales fadeDistance and plane size with sectionSize and applies boardCenter offset", async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const container = document.getElementById("root")!
  const scene = new THREE.Scene()
  const rootObject = new THREE.Object3D()
  scene.add(rootObject)

  const bounds = calculateOutlineBounds({
    type: "pcb_board",
    pcb_board_id: "split-keyboard-board",
    center: { x: 0, y: 0 },
    width: 0,
    height: 0,
    thickness: 1.6,
    material: "fr4",
    num_layers: 2,
    outline: splitKeyboardOutline,
  })

  expect(bounds.width).toBe(161.5)
  expect(bounds.height).toBe(120)
  expect(bounds.centerX).toBe(5.5)
  expect(bounds.centerY).toBe(0)

  const initialCameraPos = getInitialCameraPosition({
    boardDimensions: { width: bounds.width, height: bounds.height },
    boardCenter: { x: bounds.centerX, y: bounds.centerY },
  })
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(...initialCameraPos)

  const gridSectionSize = Math.max(
    Math.max(bounds.width, bounds.height) * 1.5,
    10,
  )

  const context: ThreeContextState = {
    scene,
    camera,
    renderer: {} as THREE.WebGLRenderer,
    rootObject,
    addFrameListener: () => {},
    removeFrameListener: () => {},
  }
  const reactRoot = createRoot(container)

  try {
    await act(async () => {
      reactRoot.render(
        <ThreeContext.Provider value={context}>
          <Grid
            rotation={[Math.PI / 2, 0, 0]}
            infiniteGrid
            cellSize={3}
            sectionSize={gridSectionSize}
            offset={{ x: bounds.centerX, y: bounds.centerY }}
          />
        </ThreeContext.Provider>,
      )
    })

    const gridMesh = scene.children.find(
      (obj): obj is THREE.Mesh => obj instanceof THREE.Mesh,
    )
    expect(gridMesh).toBeDefined()
    expect(gridMesh!.position.x).toBe(bounds.centerX)
    expect(gridMesh!.position.y).toBe(bounds.centerY)

    const material = gridMesh!.material as THREE.ShaderMaterial
    const fadeDistance = material.uniforms.fadeDistance?.value as number
    const cameraToBoardDistanceXY = Math.hypot(
      camera.position.x - bounds.centerX,
      camera.position.y - bounds.centerY,
    )

    expect(fadeDistance).toBe(gridSectionSize * 5)
    expect(fadeDistance).toBeGreaterThan(cameraToBoardDistanceXY * 2)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})

test("CameraControllerContext uses updated board camera position and active orbit target for presets", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost",
  })
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const container = document.getElementById("root")!
  const reactRoot = createRoot(container)
  let capturedPreset: ReturnType<
    ReturnType<typeof useCameraController>["getPresetConfig"]
  > = null

  const Probe = () => {
    const {
      setCameraPosition,
      handleControlsChange,
      getPresetConfig,
      cameraPosition,
    } = useCameraController()

    useEffect(() => {
      handleControlsChange({
        target: new THREE.Vector3(5.5, 0, 0),
        update: () => {},
      } as any)
      setCameraPosition([70.1, -113.05, 145.35])
    }, [handleControlsChange, setCameraPosition])

    useEffect(() => {
      if (cameraPosition?.[0] === 70.1) {
        capturedPreset = getPresetConfig("Top Down")
      }
    }, [cameraPosition, getPresetConfig])

    return null
  }

  try {
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider
          defaultTarget={new THREE.Vector3(0, 0, 0)}
          initialCameraPosition={[5, -5, 5]}
        >
          <Probe />
        </CameraControllerProvider>,
      )
    })

    expect(capturedPreset).not.toBeNull()
    expect(capturedPreset!.target).toEqual([5.5, 0, 0])
    expect(capturedPreset!.position[0]).toBe(5.5)
    expect(capturedPreset!.position[1]).toBe(0)
    expect(capturedPreset!.position[2]).toBeGreaterThan(150)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
