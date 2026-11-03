import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { GlbScene } from "../src/CadViewerGlb"
import { BoardMeshes } from "../src/CadViewerManifold"
import { CameraControllerProvider } from "../src/contexts/CameraControllerContext"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"
import { HoverContext } from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { BoardGroup } from "../src/three-components/BoardGroup"
import type { ObjectVisibility } from "../src/utils/object-visibility"
import { pickSceneObject } from "../src/utils/pick-scene-object"
import { disposeGlbScene, loadGlbScene } from "../src/utils/prerendered-glb"

const box = (name: string, size: number, z = 0) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, 1),
    new THREE.MeshBasicMaterial(),
  )
  mesh.name = name
  mesh.position.z = z
  return mesh
}

const setup = () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" })
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const scene = new THREE.Scene()
  const rootObject = new THREE.Group()
  scene.add(rootObject)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0, 10)
  const context: ThreeContextState = {
    scene,
    rootObject,
    camera,
    renderer: {
      domElement: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 200,
          height: 200,
          right: 200,
          bottom: 200,
        }),
      },
    } as THREE.WebGLRenderer,
    addFrameListener: () => {},
    removeFrameListener: () => {},
  }
  const reactRoot = createRoot(document.getElementById("root")!)
  const render = (children: React.ReactNode) =>
    act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <LayerVisibilityProvider>
            <ThreeContext.Provider value={context}>
              <HoverContext.Provider
                value={{ addHoverable: () => {}, removeHoverable: () => {} }}
              >
                {children}
              </HoverContext.Provider>
            </ThreeContext.Provider>
          </LayerVisibilityProvider>
        </CameraControllerProvider>,
      )
    })
  const cleanup = async () => {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, { ...previous, IS_REACT_ACT_ENVIRONMENT: false })
    dom.window.close()
  }
  return { context, rootObject, render, cleanup }
}

const center = { x: 100, y: 100 }

test("board meshes are picked and hidden as one board object", async () => {
  const { context, rootObject, render, cleanup } = setup()
  const boardGeom = box("board-geom", 10)
  const via = box("via-1", 1, 1)
  // A component under the board, revealed once the board is hidden.
  const component = new THREE.Group()
  component.userData.cad_component_id = "motor_cad"
  component.add(box("motor", 2, -3))
  rootObject.add(component)
  const circuitJson = [
    { type: "source_component", source_component_id: "s1", name: "MOTOR" },
    {
      type: "cad_component",
      cad_component_id: "motor_cad",
      source_component_id: "s1",
    },
  ] as any[]
  const renderBoard = (hidden: boolean) =>
    render(
      <BoardGroup pcbBoardId="pcb_board_0" hidden={hidden}>
        <BoardMeshes geometryMeshes={[boardGeom, via]} textureMeshes={[]} />
      </BoardGroup>,
    )
  try {
    await renderBoard(false)
    const group = boardGeom.parent!
    expect(group.parent).toBe(rootObject)
    expect(via.parent).toBe(group)
    expect(group.userData.pcb_board_id).toBe("pcb_board_0")
    expect(pickSceneObject(context, center, circuitJson)).toEqual({
      objectId: "pcb_board_0",
      name: "Board",
    })
    await renderBoard(true)
    // Hiding keeps the built meshes attached for a cheap unhide.
    expect(boardGeom.parent).toBe(group)
    expect(group.visible).toBe(false)
    expect(pickSceneObject(context, center, circuitJson)).toEqual({
      objectId: "motor_cad",
      name: "MOTOR",
    })
    await renderBoard(false)
    expect(group.visible).toBe(true)
    expect(pickSceneObject(context, center, circuitJson)?.objectId).toBe(
      "pcb_board_0",
    )
  } finally {
    await cleanup()
  }
  expect(rootObject.children).toEqual([component])
})

test("isolating a GLB component hides untagged board geometry", async () => {
  const { render, cleanup } = setup()
  const model = new THREE.Group()
  const board = box("Box0", 10)
  const component = new THREE.Group()
  component.userData.cad_component_id = "cad1"
  const componentMesh = box("U1 body", 2, 1)
  component.add(componentMesh)
  model.add(board, component)
  const renderGlb = (objectVisibility?: ObjectVisibility) =>
    render(<GlbScene model={model} objectVisibility={objectVisibility} />)
  try {
    await renderGlb({ hiddenIds: new Set(), isolatedId: "cad1" })
    expect(board.visible).toBe(false)
    expect(component.visible).toBe(true)
    // Meshes inside a component follow the component, not the isolation rule.
    expect(componentMesh.visible).toBe(true)
    await renderGlb({ hiddenIds: new Set(["cad1"]) })
    expect(board.visible).toBe(true)
    expect(component.visible).toBe(false)
    await renderGlb()
    expect(board.visible).toBe(true)
    expect(component.visible).toBe(true)
  } finally {
    await cleanup()
  }
})

// Generated by scripts/generate-prerendered-board-glb.ts: board "board" spans
// x 0..20, y 0..10, z -0.8..0.8 with via plating at (14, 5); U1 sits on it at
// x/y 4..6, z 0.8..2.8 (viewer mm, +Z up).
test("a GLB board tagged with pcb_board_id is picked, hidden and isolated", async () => {
  // Under any JSDOM document (another test file may leave one installed),
  // three's ImageLoader waits forever for the embedded board textures. Parse
  // without a DOM so those textures fail fast; geometry and extras are intact.
  const bytes = await Bun.file(
    new URL("./assets/prerendered-board.glb", import.meta.url),
  ).arrayBuffer()
  const dom = { window: globalThis.window, document: globalThis.document }
  Object.assign(globalThis, { window: undefined, document: undefined })
  const model = await loadGlbScene(bytes, new AbortController().signal).finally(
    () => Object.assign(globalThis, dom),
  )
  const { context, render, cleanup } = setup()
  const board = model.getObjectByName("Box0")!
  // GLTFLoader sanitizes node names: "Via Plating" -> "Via_Plating".
  const via = model.getObjectByName("Via_Plating")!
  const component = model.getObjectByName("U1")!
  // The textured board loads as a group of meshes, picked through its parent.
  expect(board.type).toBe("Group")
  expect(board.children.length).toBeGreaterThan(1)
  expect(via.userData.pcb_board_id).toBe("board")
  const pickAt = (x: number, y: number) => {
    context.camera.position.set(x, y, 30)
    context.camera.lookAt(x, y, 0)
    return pickSceneObject(context, center, [])
  }
  const renderGlb = (objectVisibility?: ObjectVisibility) =>
    render(<GlbScene model={model} objectVisibility={objectVisibility} />)
  try {
    await renderGlb()
    expect(pickAt(17, 5)).toEqual({ objectId: "board", name: "Board" })
    expect(pickAt(5, 5)).toEqual({ objectId: "cad1", name: "U1" })

    await renderGlb({ hiddenIds: new Set(["board"]) })
    expect([board.visible, via.visible, component.visible]).toEqual([
      false,
      false,
      true,
    ])
    expect(pickAt(17, 5)).toBeUndefined()
    expect(pickAt(5, 5)?.objectId).toBe("cad1")

    await renderGlb({ hiddenIds: new Set(), isolatedId: "board" })
    expect([board.visible, via.visible, component.visible]).toEqual([
      true,
      true,
      false,
    ])
    // The hidden part no longer covers the board beneath it.
    expect(pickAt(5, 5)?.objectId).toBe("board")

    await renderGlb()
    expect([board.visible, via.visible, component.visible]).toEqual([
      true,
      true,
      true,
    ])
  } finally {
    await cleanup()
    disposeGlbScene(model)
  }
})
