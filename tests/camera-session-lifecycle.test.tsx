import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { useEffect } from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import {
  CameraControllerProvider,
  useCameraController,
} from "../src/contexts/CameraControllerContext"
import { useCameraSession } from "../src/hooks/useCameraSession"
import {
  loadCameraSession,
  saveCameraSession,
} from "../src/utils/camera-session-storage"

function createStoredCameraSession({
  cameraSessionScope,
  position,
}: {
  cameraSessionScope: string
  position: [number, number, number]
}) {
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(...position)
  const controls = new OrbitControls(camera, document.createElement("div"))
  saveCameraSession({ camera, controls, cameraSessionScope })
  controls.dispose()
}

const CameraSessionHarness = ({
  camera,
  controls,
  cameraSessionScope,
}: {
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  cameraSessionScope: string
}) => {
  const { controlsRef } = useCameraController()
  const { handleCameraCreated, handleControlsChange } = useCameraSession({
    cameraSessionScope,
  })

  useEffect(() => {
    controlsRef.current = controls
    handleCameraCreated(camera)
    handleControlsChange()
    handleControlsChange()
  }, [camera, controls, controlsRef, handleCameraCreated, handleControlsChange])

  return null
}

test("changes camera session scope without remounting the hook", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://3d-viewer.test",
  })
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    sessionStorage: globalThis.sessionStorage,
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    sessionStorage: dom.window.sessionStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  createStoredCameraSession({
    cameraSessionScope: "off-origin-board",
    position: [451, 233, 78],
  })
  createStoredCameraSession({
    cameraSessionScope: "centered-board",
    position: [18, -32, 41],
  })

  const camera = new THREE.PerspectiveCamera()
  const controls = new OrbitControls(camera, document.createElement("div"))
  const reactRoot = createRoot(document.getElementById("root")!)

  try {
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <CameraSessionHarness
            camera={camera}
            controls={controls}
            cameraSessionScope="off-origin-board"
          />
        </CameraControllerProvider>,
      )
    })
    expect(
      camera.position.distanceTo(new THREE.Vector3(451, 233, 78)),
    ).toBeLessThan(0.0001)

    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <CameraSessionHarness
            camera={camera}
            controls={controls}
            cameraSessionScope="centered-board"
          />
        </CameraControllerProvider>,
      )
    })
    expect(
      camera.position.distanceTo(new THREE.Vector3(18, -32, 41)),
    ).toBeLessThan(0.0001)

    await act(
      () => new Promise<void>((resolve) => dom.window.setTimeout(resolve, 200)),
    )
    const offOriginCamera = new THREE.PerspectiveCamera()
    const offOriginControls = new OrbitControls(
      offOriginCamera,
      document.createElement("div"),
    )
    loadCameraSession({
      camera: offOriginCamera,
      controls: offOriginControls,
      cameraSessionScope: "off-origin-board",
    })
    expect(
      offOriginCamera.position.distanceTo(new THREE.Vector3(451, 233, 78)),
    ).toBeLessThan(0.0001)
    offOriginControls.dispose()
  } finally {
    await act(async () => reactRoot.unmount())
    controls.dispose()
    Object.assign(globalThis, {
      ...previousGlobals,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
