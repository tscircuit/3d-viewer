import { expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import { createRoot } from "react-dom/client"
import { act } from "react"
import * as THREE from "three"
import type { AnyCircuitElement, CadComponent } from "circuit-json"

const loadedMaterials: THREE.MeshStandardMaterial[] = []
const envTexture = new THREE.Texture()
envTexture.name = "test-environment-map"
const getDefaultEnvironmentMapMock = mock(() => envTexture)

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

mock.module("three-stdlib", () => {
  class MockGLTFLoader {
    load(
      _url: string,
      onLoad: (gltf: { scene: THREE.Group }) => void,
      _onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (error: unknown) => void,
    ) {
      try {
        const material = new THREE.MeshStandardMaterial({
          envMapIntensity: 0.1,
        })
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
        const scene = new THREE.Group()
        scene.add(mesh)
        loadedMaterials.push(material)
        queueMicrotask(() => onLoad({ scene }))
      } catch (error) {
        onError?.(error)
      }
    }
  }

  class MockVRMLLoader {
    load(
      _url: string,
      onLoad: (object: THREE.Group) => void,
      _onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (error: unknown) => void,
    ) {
      try {
        onLoad(new THREE.Group())
      } catch (error) {
        onError?.(error)
      }
    }
  }

  class MockSTLLoader {
    load(
      _url: string,
      onLoad: (geometry: THREE.BufferGeometry) => void,
      _onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (error: unknown) => void,
    ) {
      try {
        onLoad(new THREE.BufferGeometry())
      } catch (error) {
        onError?.(error)
      }
    }
  }

  class MockOBJLoader {
    load(
      _url: string,
      onLoad: (object: THREE.Group) => void,
      _onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (error: unknown) => void,
    ) {
      try {
        onLoad(new THREE.Group())
      } catch (error) {
        onError?.(error)
      }
    }
  }

  class MockMTLLoader {
    load(
      _url: string,
      onLoad: (materials: unknown) => void,
      _onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (error: unknown) => void,
    ) {
      try {
        onLoad({})
      } catch (error) {
        onError?.(error)
      }
    }
  }

  return {
    GLTFLoader: MockGLTFLoader,
    VRMLLoader: MockVRMLLoader,
    STLLoader: MockSTLLoader,
    OBJLoader: MockOBJLoader,
    MTLLoader: MockMTLLoader,
  }
})

mock.module("../src/react-three/getDefaultEnvironmentMap.ts", () => ({
  getDefaultEnvironmentMap: getDefaultEnvironmentMapMock,
}))

test("GLB cadModel applies the default environment map", async () => {
  loadedMaterials.length = 0
  getDefaultEnvironmentMapMock.mockReset()
  getDefaultEnvironmentMapMock.mockImplementation(() => envTexture)

  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
    {
      url: "https://localhost",
      pretendToBeVisual: true,
    },
  )

  const originalGlobals = {
    window: globalThis.window as any,
    document: globalThis.document as any,
    navigator: globalThis.navigator as any,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    devicePixelRatio: globalThis.devicePixelRatio,
    HTMLElement: globalThis.HTMLElement as any,
    HTMLCanvasElement: globalThis.HTMLCanvasElement as any,
    localStorage: (globalThis as any).localStorage as any,
  }

  const { window } = dom
  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    requestAnimationFrame:
      window.requestAnimationFrame?.bind(window) ??
      ((cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 16)),
    cancelAnimationFrame:
      window.cancelAnimationFrame?.bind(window) ??
      ((handle: number) => clearTimeout(handle)),
    devicePixelRatio: 1,
    HTMLElement: window.HTMLElement,
    HTMLCanvasElement: window.HTMLCanvasElement,
    localStorage: window.localStorage,
  })

  const board: AnyCircuitElement = {
    type: "pcb_board",
    pcb_board_id: "pcb_board_remote_glb",
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    width: 10,
    height: 10,
  }

  const pcbComponent: AnyCircuitElement = {
    type: "pcb_component",
    pcb_component_id: "pcb_component_remote_glb",
    source_component_id: "source_component_remote_glb",
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    layer: "top",
    rotation: 0,
  }

  const sourceComponent: AnyCircuitElement = {
    type: "source_component",
    source_component_id: "source_component_remote_glb",
    name: "Remote GLB Chip",
    ftype: "simple_chip",
  }

  const cadComponent: CadComponent = {
    type: "cad_component",
    cad_component_id: "cad_component_remote_glb",
    source_component_id: "source_component_remote_glb",
    pcb_component_id: "pcb_component_remote_glb",
    position: { x: 0, y: 0, z: 0.6 },
    rotation: { x: 90, y: 0, z: 0 },
    model_glb_url: "https://modelcdn.tscircuit.com/jscad_models/soic6.glb",
  }

  const circuitJson: AnyCircuitElement[] = [
    board,
    pcbComponent,
    sourceComponent,
    cadComponent,
  ]

  expect(cadComponent.model_glb_url).toBe(
    "https://modelcdn.tscircuit.com/jscad_models/soic6.glb",
  )

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera()
  const rootObject = new THREE.Object3D()
  const renderer = {
    domElement: window.document.createElement("canvas"),
    setSize: () => {},
    setPixelRatio: () => {},
    render: () => {},
    dispose: () => {},
  } as unknown as THREE.WebGLRenderer

  const frameListeners = new Set<(time: number, delta: number) => void>()
  const contextValue = {
    scene,
    camera,
    renderer,
    rootObject,
    addFrameListener: (listener: (time: number, delta: number) => void) => {
      frameListeners.add(listener)
    },
    removeFrameListener: (listener: (time: number, delta: number) => void) => {
      frameListeners.delete(listener)
    },
  }

  const [{ AnyCadComponent }, { HoverProvider }, { ThreeContext }] =
    await Promise.all([
      import("../src/AnyCadComponent.tsx"),
      import("../src/react-three/HoverContext.tsx"),
      import("../src/react-three/ThreeContext.ts"),
    ])

  const container = window.document.getElementById("root") as HTMLElement
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <ThreeContext.Provider value={contextValue as any}>
        <HoverProvider>
          <AnyCadComponent
            cad_component={cadComponent}
            circuitJson={circuitJson}
          />
        </HoverProvider>
      </ThreeContext.Provider>,
    )
    await Promise.resolve()
  })

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  expect(loadedMaterials).toHaveLength(1)
  const material = loadedMaterials[0]!
  expect(material.envMap).toBe(envTexture)
  expect(material.envMapIntensity).toBeCloseTo(1.25)
  expect(getDefaultEnvironmentMapMock).toHaveBeenCalledTimes(1)

  await act(async () => {
    root.unmount()
  })

  Object.assign(globalThis, originalGlobals)
  dom.window.close()
})
