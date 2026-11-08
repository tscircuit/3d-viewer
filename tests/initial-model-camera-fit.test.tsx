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
import { useCameraSession } from "../src/hooks/useCameraSession"
import { ThreeContext } from "../src/react-three/ThreeContext"
import { FitCameraToModels } from "../src/three-components/FitCameraToModels"
import { saveCameraSession } from "../src/utils/camera-session-storage"

function model(id: string, position: THREE.Vector3, size = 20) {
  const group = new THREE.Group()
  group.userData.cad_component_id = id
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size))
  // Model vertices can be far from a shared CAD origin (as in FLEX17).
  mesh.geometry.translate(position.x, position.y, position.z)
  group.add(mesh)
  return group
}

function expectInView(camera: THREE.Camera, object: THREE.Object3D) {
  camera.updateMatrixWorld()
  const bounds = new THREE.Box3().setFromObject(object)
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ),
  )
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z])
        expect(frustum.containsPoint(new THREE.Vector3(x, y, z))).toBe(true)
}

async function withScene(
  run: (scene: {
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera
    controls: OrbitControls
    models: THREE.Group
    frame: () => void
    connectControls: () => void
    userInteractedRef: { current: boolean }
  }) => Promise<void> | void,
  {
    orthographic = false,
    restored = false,
    controlsInitiallyEnabled = true,
  } = {},
) {
  const dom = new JSDOM('<div id="root"></div>', { url: "https://viewer.test" })
  const previous = {
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
  const camera = orthographic
    ? new THREE.OrthographicCamera(-15, 15, 10, -10, -1000, 1000)
    : new THREE.PerspectiveCamera(75, 1.5, 0.1, 1000)
  camera.position.set(5, -5, 5)
  camera.up.set(0, 0, 1)
  const controls = new OrbitControls(camera, document.createElement("div"))
  controls.update()
  if (restored) {
    camera.position.set(150, -230, 180)
    controls.target.set(50, 20, -10)
    controls.update()
    saveCameraSession({ camera, controls })
    camera.position.set(5, -5, 5)
    controls.target.set(0, 0, 0)
    controls.update()
  }
  const models = new THREE.Group()
  const frames = new Set<() => void>()
  const userInteractedRef = { current: false }
  let activeControlsRef: { current: OrbitControls | null }
  const Harness = () => {
    const { controlsRef } = useCameraController()
    activeControlsRef = controlsRef
    controlsRef.current = controlsInitiallyEnabled ? controls : null
    const { handleCameraCreated, handleControlsChange, restoredCameraRef } =
      useCameraSession()
    // Match Canvas.onCreated followed by OrbitControls' initial registration.
    // Effect order matters: fitting must defer to session restoration.
    useEffect(() => {
      handleCameraCreated(camera)
      handleControlsChange()
    }, [handleCameraCreated, handleControlsChange])
    return (
      <FitCameraToModels
        enabled
        restoredCameraRef={restoredCameraRef}
        userInteractedRef={userInteractedRef}
      />
    )
  }
  const root = createRoot(document.getElementById("root")!)
  try {
    await act(async () => {
      root.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <ThreeContext.Provider
            value={{
              camera,
              rootObject: models,
              scene: new THREE.Scene(),
              renderer: {} as THREE.WebGLRenderer,
              addFrameListener: (callback) =>
                frames.add(callback as () => void),
              removeFrameListener: (callback) =>
                frames.delete(callback as () => void),
            }}
          >
            <Harness />
          </ThreeContext.Provider>
        </CameraControllerProvider>,
      )
    })
    await run({
      camera,
      controls,
      models,
      frame: () => frames.forEach((callback) => callback()),
      connectControls: () => {
        activeControlsRef.current = controls
        controls.update()
      },
      userInteractedRef,
    })
  } finally {
    await act(async () => root.unmount())
    controls.dispose()
    models.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        ;(o.material as THREE.Material).dispose()
      }
    })
    Object.assign(globalThis, { ...previous, IS_REACT_ACT_ENVIRONMENT: false })
    dom.window.close()
  }
}

for (const orthographic of [false, true]) {
  test(`frames baked model offsets with ${orthographic ? "orthographic" : "perspective"} projection`, async () => {
    await withScene(
      ({ camera, controls, models, frame }) => {
        const assembly = model("body", new THREE.Vector3(140, 60, 30), 100)
        models.add(assembly)
        // A scene helper outside the model must not affect initial bounds.
        models.add(new THREE.Mesh(new THREE.BoxGeometry(10000, 10000, 10000)))
        frame()
        expectInView(camera, assembly)
        expect(controls.target.toArray()).toEqual([140, 60, 30])
        const fittedPosition = camera.position.clone()
        assembly.position.set(300, 0, 100)
        frame()
        // Explosion playback and scene edits keep the fitted camera.
        expect(camera.position.toArray()).toEqual(fittedPosition.toArray())
      },
      { orthographic },
    )
  })
}

test("includes delayed models without waiting for an empty or failed model", async () => {
  await withScene(({ camera, models, frame }) => {
    const first = model("first", new THREE.Vector3(80, 0, 0))
    const delayed = new THREE.Group()
    delayed.userData.cad_component_id = "delayed"
    const missing = new THREE.Group()
    missing.userData.cad_component_id = "missing"
    models.add(first, delayed, missing)
    frame()
    expectInView(camera, first)
    const loaded = model("contents", new THREE.Vector3(-150, 10, 40))
    delayed.add(...loaded.children)
    frame()
    expectInView(camera, first)
    expectInView(camera, delayed)
    const position = camera.position.clone()
    first.position.z = 100
    frame()
    expect(camera.position.toArray()).toEqual(position.toArray())
  })
})

test("preserves a restored session even when geometry arrives later", async () => {
  await withScene(
    ({ camera, controls, models, frame }) => {
      models.add(model("body", new THREE.Vector3(100, 50, 0), 100))
      frame()
      expect(camera.position.x).toBeCloseTo(150)
      expect(camera.position.y).toBeCloseTo(-230)
      expect(camera.position.z).toBeCloseTo(180)
      expect(controls.target.toArray()).toEqual([50, 20, -10])
    },
    { restored: true },
  )
})

test("late loads do not override a camera the user has moved", async () => {
  await withScene(({ camera, models, frame, userInteractedRef }) => {
    const delayed = new THREE.Group()
    delayed.userData.cad_component_id = "delayed"
    models.add(model("body", new THREE.Vector3(100, 0, 0)), delayed)
    frame()
    userInteractedRef.current = true
    camera.position.set(100, -200, 300)
    const loaded = model("contents", new THREE.Vector3(-500, 0, 0))
    delayed.add(...loaded.children)
    frame()
    expect(camera.position.toArray()).toEqual([100, -200, 300])
  })
})

test("enabling click-to-interact keeps the fitted off-origin target", async () => {
  await withScene(
    ({
      camera,
      controls,
      models,
      frame,
      connectControls,
      userInteractedRef,
    }) => {
      models.add(model("body", new THREE.Vector3(140, 60, 30), 100))
      frame()
      const position = camera.position.clone()
      const quaternion = camera.quaternion.clone()
      userInteractedRef.current = true
      connectControls()
      frame()
      expect(controls.target.toArray()).toEqual([140, 60, 30])
      expect(camera.position.distanceTo(position)).toBeLessThan(0.00000001)
      expect(camera.quaternion.angleTo(quaternion)).toBeLessThan(0.00001)
    },
    { controlsInitiallyEnabled: false },
  )
})
