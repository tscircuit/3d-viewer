import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import type { CadComponent } from "circuit-json"
import { JSDOM } from "jsdom"
import { act, useEffect } from "react"
import { createRoot, type Root } from "react-dom/client"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { AnyCadComponent } from "../src/AnyCadComponent"
import {
  CameraControllerProvider,
  useCameraController,
} from "../src/contexts/CameraControllerContext"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"
import { HoverContext } from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { getObjectBounds } from "../src/reference-objects/fit-camera-to-bounds"
import type { Bounds3d } from "../src/reference-objects/reference-object"
import { FitCameraToBoardlessScene } from "../src/three-components/reference-object"
import { getInitialCameraPosition } from "../src/utils/get-initial-camera-position"

const boxObj = `v -19 -18 0
v 19 -18 0
v 19 18 0
v -19 18 0
v -19 -18 12.8
v 19 -18 12.8
v 19 18 12.8
v -19 18 12.8
f 1 3 2
f 1 4 3
f 5 6 7
f 5 7 8
f 1 2 6
f 1 6 5
f 2 3 7
f 2 7 6
f 3 4 8
f 3 8 7
f 4 1 5
f 4 5 8`

let dom: JSDOM
let reactRoot: Root
let scene: THREE.Scene
let sceneRoot: THREE.Object3D
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let previousWindow: typeof globalThis.window
let previousDocument: typeof globalThis.document
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined

function CameraControlsBinder({
  cameraInstance,
  controlsInstance,
}: {
  cameraInstance: THREE.PerspectiveCamera
  controlsInstance: OrbitControls
}) {
  const { mainCameraRef, controlsRef } = useCameraController()
  useEffect(() => {
    mainCameraRef.current = cameraInstance
    controlsRef.current = controlsInstance
  }, [cameraInstance, controlsInstance, mainCameraRef, controlsRef])
  return null
}

beforeEach(() => {
  dom = new JSDOM('<div id="root"></div>')
  previousWindow = globalThis.window
  previousDocument = globalThis.document
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  window.TSCIRCUIT_MODEL_LOADER_CACHE = new Map()
  reactRoot = createRoot(document.getElementById("root")!)
  scene = new THREE.Scene()
  sceneRoot = new THREE.Object3D()
  scene.add(sceneRoot)
  camera = new THREE.PerspectiveCamera(75, 1.5, 0.1, 1000)
  camera.up.set(0, 0, 1)
  camera.position.set(...getInitialCameraPosition({}))
  camera.lookAt(0, 0, 0)
  controls = new OrbitControls(camera, document.createElement("div"))
})

afterEach(async () => {
  await act(async () => reactRoot.unmount())
  controls.dispose()
  fetchSpy?.mockRestore()
  fetchSpy = undefined
  Object.assign(globalThis, {
    window: previousWindow,
    document: previousDocument,
    IS_REACT_ACT_ENVIRONMENT: false,
  })
  dom.window.close()
})

test("fits initial camera outside a boardless 38x36x12.8mm mechanical part", async () => {
  // Before the CAD model is fitted, the fallback camera [5, -5, 5] is inside the part.
  expect(
    camera.position.x > -19 &&
      camera.position.x < 19 &&
      camera.position.y > -18 &&
      camera.position.y < 18 &&
      camera.position.z > 0 &&
      camera.position.z < 12.8,
  ).toBe(true)

  const dockBase: CadComponent = {
    type: "cad_component",
    cad_component_id: "dock_base",
    source_component_id: "dock_base_source",
    model_obj_url: `data:text/plain,${encodeURIComponent(boxObj)}`,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    model_unit_to_mm_scale_factor: 1,
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
    show_as_translucent_model: false,
  }

  let reportedBounds: Bounds3d | undefined
  const context: ThreeContextState = {
    scene,
    camera,
    renderer: {} as THREE.WebGLRenderer,
    rootObject: sceneRoot,
    addFrameListener: () => {},
    removeFrameListener: () => {},
  }

  await act(async () => {
    reactRoot.render(
      <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
        <CameraControlsBinder
          cameraInstance={camera}
          controlsInstance={controls}
        />
        <ThreeContext.Provider value={context}>
          <HoverContext.Provider
            value={{ addHoverable: () => {}, removeHoverable: () => {} }}
          >
            <LayerVisibilityProvider>
              <AnyCadComponent
                cad_component={dockBase}
                circuitJson={[dockBase]}
              />
              <FitCameraToBoardlessScene
                onBoundsChange={(bounds) => {
                  reportedBounds = bounds
                }}
              />
            </LayerVisibilityProvider>
          </HoverContext.Provider>
        </ThreeContext.Provider>
      </CameraControllerProvider>,
    )
  })

  expect(reportedBounds?.minX).toBeCloseTo(-19, 5)
  expect(reportedBounds?.maxX).toBeCloseTo(19, 5)
  expect(reportedBounds?.minY).toBeCloseTo(-18, 5)
  expect(reportedBounds?.maxY).toBeCloseTo(18, 5)
  expect(reportedBounds?.minZ).toBeCloseTo(0, 5)
  expect(reportedBounds?.maxZ).toBeCloseTo(12.8, 5)
  const partBox = new THREE.Box3(
    new THREE.Vector3(-19, -18, 0),
    new THREE.Vector3(19, 18, 12.8),
  )
  expect(partBox.containsPoint(camera.position)).toBe(false)
  expect(controls.target.x).toBeCloseTo(0, 5)
  expect(controls.target.y).toBeCloseTo(0, 5)
  expect(controls.target.z).toBeCloseTo(6.4, 5)
})

test("ignores loading fallback mesh until async mechanical model resolves and respects user interaction", async () => {
  const request = Promise.withResolvers<Response>()
  fetchSpy = spyOn(globalThis, "fetch").mockReturnValue(request.promise)

  const dockBase: CadComponent = {
    type: "cad_component",
    cad_component_id: "async_dock_base",
    source_component_id: "async_dock_base_source",
    model_obj_url: "https://models.example/dock-base.obj",
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    model_unit_to_mm_scale_factor: 1,
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
  }

  const context: ThreeContextState = {
    scene,
    camera,
    renderer: {} as THREE.WebGLRenderer,
    rootObject: sceneRoot,
    addFrameListener: () => {},
    removeFrameListener: () => {},
  }

  await act(async () => {
    reactRoot.render(
      <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
        <CameraControlsBinder
          cameraInstance={camera}
          controlsInstance={controls}
        />
        <ThreeContext.Provider value={context}>
          <HoverContext.Provider
            value={{ addHoverable: () => {}, removeHoverable: () => {} }}
          >
            <LayerVisibilityProvider>
              <AnyCadComponent
                cad_component={dockBase}
                circuitJson={[dockBase]}
              />
              <FitCameraToBoardlessScene />
            </LayerVisibilityProvider>
          </HoverContext.Provider>
        </ThreeContext.Provider>
      </CameraControllerProvider>,
    )
  })

  // While fetch is pending, only the 0.5mm fallback mesh is mounted; bounds must remain undefined.
  expect(getObjectBounds(sceneRoot)).toBeUndefined()
  expect(camera.position.x).toBeCloseTo(5, 5)
  expect(camera.position.y).toBeCloseTo(-5, 5)
  expect(camera.position.z).toBeCloseTo(5, 5)

  await act(async () => {
    request.resolve(new Response(boxObj))
  })

  expect(camera.position.y).toBeLessThan(-18)
  expect(camera.position.z).toBeGreaterThan(12.8)

  // Simulate user orbit interaction; subsequent scene updates should not override camera position.
  controls.dispatchEvent({ type: "start" } as any)
  camera.position.set(100, -100, 100)
  scene.dispatchEvent({ type: "cad-scene-updated" } as any)
  expect(camera.position.toArray()).toEqual([100, -100, 100])
})
