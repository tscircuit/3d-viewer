import { afterEach, beforeEach, expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import * as THREE from "three"
import { GlbScene } from "../src/CadViewerGlb"
import { CameraControllerProvider } from "../src/contexts/CameraControllerContext"
import { HoverProvider } from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { pickCadComponent } from "../src/utils/pick-cad-component"
import { disposeGlbScene, loadGlbScene } from "../src/utils/prerendered-glb"

let dom: JSDOM
let reactRoot: Root
let model: THREE.Group
let context: ThreeContextState
let canvas: HTMLCanvasElement
let frames: Set<(time: number, delta: number) => void>
let previousWindow: typeof globalThis.window
let previousDocument: typeof globalThis.document
let previousActEnvironment: unknown

beforeEach(async () => {
  dom = new JSDOM(
    '<div id="root"></div><div id="viewer"><canvas></canvas></div>',
    {
      url: "http://localhost",
    },
  )
  previousWindow = globalThis.window
  previousDocument = globalThis.document
  previousActEnvironment = Reflect.get(globalThis, "IS_REACT_ACT_ENVIRONMENT")
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const bytes = await Bun.file(
    new URL("./assets/legacy-prerendered-components.glb", import.meta.url),
  ).arrayBuffer()
  model = await loadGlbScene(bytes, new AbortController().signal)
  canvas = document.querySelector("canvas")!
  canvas.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 200,
    bottom: 200,
    width: 200,
    height: 200,
    toJSON: () => ({}),
  })
  const rootObject = new THREE.Group()
  const scene = new THREE.Scene()
  scene.add(rootObject)
  frames = new Set()
  context = {
    scene,
    rootObject,
    camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
    renderer: { domElement: canvas } as THREE.WebGLRenderer,
    addFrameListener: (callback) => frames.add(callback),
    removeFrameListener: (callback) => frames.delete(callback),
  }
  reactRoot = createRoot(document.getElementById("root")!)
})

afterEach(async () => {
  await act(async () => reactRoot.unmount())
  disposeGlbScene(model)
  dom.window.close()
  Object.assign(globalThis, {
    window: previousWindow,
    document: previousDocument,
    IS_REACT_ACT_ENVIRONMENT: previousActEnvironment,
  })
})

const render = async () => {
  await act(async () => {
    reactRoot.render(
      <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
        <ThreeContext.Provider value={context}>
          <HoverProvider>
            <GlbScene model={model} />
          </HoverProvider>
        </ThreeContext.Provider>
      </CameraControllerProvider>,
    )
  })
  context.scene.updateMatrixWorld(true)
}

const move = async (clientX = 100, clientY = 100) => {
  await act(async () => {
    canvas.dispatchEvent(
      new dom.window.MouseEvent("mousemove", {
        clientX,
        clientY,
        bubbles: true,
      }),
    )
  })
  for (const frame of frames) frame(0, 0)
}

const hoverComponent = async (x: number) => {
  context.camera.position.set(x, 7, 30)
  context.camera.lookAt(x, 7, 3)
  context.camera.updateMatrixWorld(true)
  await move()
}

const tooltipText = () => document.getElementById("viewer")!.textContent

const meshes = () => {
  const result: THREE.Mesh[] = []
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) result.push(object)
  })
  return result
}

const wrapFirstMesh = () => {
  const mesh = meshes()[0]!
  const group = new THREE.Group()
  mesh.parent!.add(group)
  group.add(mesh)
  return group
}

test("legacy GLB hover preserves original labels despite sanitization and duplicate names", async () => {
  const importedMeshes = meshes()
  expect(importedMeshes).toHaveLength(2)
  expect(new Set(importedMeshes.map((mesh) => mesh.name)).size).toBe(2)
  for (const mesh of importedMeshes) {
    expect(mesh.name).not.toBe("REF.Phone")
    expect(mesh.userData.name).toBe("REF.Phone")
  }
  await render()

  for (const x of [5, 15]) {
    await hoverComponent(x)
    expect(tooltipText()).toBe("REF.Phone")
    expect(pickCadComponent(context, { x: 100, y: 100 }, [])).toBeUndefined()
  }
})

test("legacy GLB hover survives repeated motion and clears when the pointer leaves the model", async () => {
  await render()
  await hoverComponent(5)
  expect(tooltipText()).toBe("REF.Phone")
  await move(101)
  expect(tooltipText()).toBe("REF.Phone")
  await move(0, 0)
  expect(tooltipText()).toBe("")
})

test("ancestor component metadata takes priority over a child's legacy label", async () => {
  const group = wrapFirstMesh()
  group.userData.tscircuit = { componentName: "Authoritative component" }
  await render()
  await hoverComponent(5)
  expect(tooltipText()).toBe("Authoritative component")
})

test("unnamed legacy GLB nodes do not display synthetic mesh or scene names", async () => {
  model.traverse((object) => {
    delete object.userData.name
  })
  await render()
  await hoverComponent(5)
  expect(pickCadComponent(context, { x: 100, y: 100 }, [])).toBeUndefined()
  expect(tooltipText()).toBe("")
})

test("a hidden ancestor suppresses an existing legacy tooltip", async () => {
  const group = wrapFirstMesh()
  await render()
  await hoverComponent(5)
  expect(tooltipText()).toBe("REF.Phone")
  group.visible = false
  await move()
  expect(tooltipText()).toBe("")
})
