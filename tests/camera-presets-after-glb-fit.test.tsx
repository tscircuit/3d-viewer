import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, useEffect } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import {
  CameraControllerProvider,
  useCameraController,
} from "../src/contexts/CameraControllerContext"
import type { CameraPreset } from "../src/hooks/cameraAnimation"
import { fitCameraToBounds } from "../src/reference-objects/fit-camera-to-bounds"

type GetPresetConfig = ReturnType<typeof useCameraController>["getPresetConfig"]

function CameraPresetHarness({
  camera,
  controls,
  onReady,
}: {
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  onReady: (getPresetConfig: GetPresetConfig) => void
}) {
  const { mainCameraRef, controlsRef, getPresetConfig } = useCameraController()
  useEffect(() => {
    mainCameraRef.current = camera
    controlsRef.current = controls
    onReady(getPresetConfig)
  }, [camera, controls, mainCameraRef, controlsRef, getPresetConfig, onReady])
  return null
}

test("camera presets keep the fitted BeaglePlay board in view", async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const camera = new THREE.PerspectiveCamera(45, 1.5, 0.1, 2000)
  camera.up.set(0, 0, 1)
  const controls = new OrbitControls(camera, document.createElement("div"))
  // PCB bounds from the demo's Altium-derived BeaglePlay fixture, in mm.
  const fitted = fitCameraToBounds(camera, controls, {
    minX: -330.2762,
    maxX: -250.27382,
    minY: 234.2388,
    maxY: 314.24118,
    minZ: -0.8,
    maxZ: 0.8,
  })
  const root = createRoot(document.getElementById("root")!)
  let getPresetConfig: GetPresetConfig | undefined
  try {
    await act(async () => {
      root.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <CameraPresetHarness
            camera={camera}
            controls={controls}
            onReady={(getPresetConfigFromContext) => {
              getPresetConfig = getPresetConfigFromContext
            }}
          />
        </CameraControllerProvider>,
      )
    })
    if (!getPresetConfig) throw new Error("Camera controller did not mount")
    const presets: CameraPreset[] = [
      "Top Down",
      "Top Center Angled",
      "Top Left Corner",
      "Top Right Corner",
      "Left Sideview",
      "Right Sideview",
      "Front",
    ]
    for (const preset of presets) {
      const config = getPresetConfig(preset)
      if (!config?.target) throw new Error(`Missing ${preset} camera target`)
      expect(config.target).toEqual(fitted.center.toArray())
      const presetCamera = camera.clone()
      presetCamera.position.set(...config.position)
      presetCamera.up.set(...(config.up ?? [0, 0, 1]))
      presetCamera.lookAt(new THREE.Vector3(...config.target))
      presetCamera.updateMatrixWorld()
      const frustum = new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(
          presetCamera.projectionMatrix,
          presetCamera.matrixWorldInverse,
        ),
      )
      expect(frustum.containsPoint(fitted.center)).toBe(true)
    }
    controls.target.add(new THREE.Vector3(12, -8, 0))
    expect(getPresetConfig("Top Down")?.target).toEqual(
      controls.target.toArray(),
    )
    expect(getPresetConfig("Custom")).toBeNull()
  } finally {
    await act(async () => root.unmount())
    controls.dispose()
    Object.assign(globalThis, {
      ...previousGlobals,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
