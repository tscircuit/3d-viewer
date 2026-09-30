import { expect, spyOn, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import { act, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import {
  LayerVisibilityProvider,
  useLayerVisibility,
} from "../src/contexts/LayerVisibilityContext"
import { useManifoldBoardBuilder } from "../src/hooks/useManifoldBoardBuilder"
import { HoverContext } from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { JscadBoardTextures } from "../src/three-components/JscadBoardTextures"
import { JscadModel } from "../src/three-components/JscadModel"
import * as textureModule from "../src/textures/create-combined-board-textures"

async function withScene(
  run: (scene: {
    root: ReturnType<typeof createRoot>
    rootObject: THREE.Object3D
    context: ThreeContextState
  }) => Promise<void>,
) {
  const dom = new JSDOM('<div id="root"></div>')
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const createElement = dom.window.document.createElement.bind(
    dom.window.document,
  )
  dom.window.document.createElement = ((tag: string, options: any) =>
    tag === "canvas" ? createCanvas(1, 1) : createElement(tag, options)) as any
  const root = createRoot(document.getElementById("root")!)
  const rootObject = new THREE.Object3D()
  const context: ThreeContextState = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as THREE.WebGLRenderer,
    rootObject,
    addFrameListener: () => {},
    removeFrameListener: () => {},
  }
  try {
    await run({ root, rootObject, context })
  } finally {
    await act(async () => root.unmount())
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
}

const plan = {
  type: "cuboid" as const,
  size: [10, 8, 4] as [number, number, number],
}
const hover = { addHoverable: () => {}, removeHoverable: () => {} }
const noop = () => {}

function findMesh(root: THREE.Object3D) {
  let mesh:
    | THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
    | undefined
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) mesh = object as typeof mesh
  })
  if (!mesh) throw new Error("Missing enclosure mesh")
  return mesh
}

test("changing enclosure transparency preserves its geometry", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    const render = (translucent: boolean) =>
      act(async () =>
        root.render(
          <ThreeContext.Provider value={context}>
            <HoverContext.Provider value={hover}>
              <JscadModel
                jscadPlan={plan}
                isTranslucent={translucent}
                isHovered={false}
                onHover={noop}
                onUnhover={noop}
              />
            </HoverContext.Provider>
          </ThreeContext.Provider>,
        ),
      )
    await render(false)
    const geometry = findMesh(rootObject).geometry
    await render(true)
    const translucentMesh = findMesh(rootObject)
    expect(translucentMesh.geometry).toBe(geometry)
    expect(translucentMesh.material.transparent).toBe(true)
    expect(translucentMesh.material.opacity).toBe(0.5)
    expect(translucentMesh.material.map).toBeNull()
    await render(false)
    expect(findMesh(rootObject).geometry).toBe(geometry)
    expect(findMesh(rootObject).material.transparent).toBe(false)
  })
})

test("unmounting enclosure releases geometry and material", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    await act(async () =>
      root.render(
        <ThreeContext.Provider value={context}>
          <HoverContext.Provider value={hover}>
            <JscadModel
              jscadPlan={plan}
              isHovered={false}
              onHover={noop}
              onUnhover={noop}
            />
          </HoverContext.Provider>
        </ThreeContext.Provider>,
      ),
    )
    const mesh = findMesh(rootObject)
    let geometryDisposed = 0,
      materialDisposed = 0
    mesh.geometry.addEventListener("dispose", () => geometryDisposed++)
    mesh.material.addEventListener("dispose", () => materialDisposed++)
    await act(async () => root.render(null))
    expect(rootObject.children).toHaveLength(0)
    expect(geometryDisposed).toBe(1)
    expect(materialDisposed).toBe(1)
  })
})

for (const renderer of ["jscad", "manifold"] as const) {
  test(`${renderer}: enclosure visibility does not rebuild PCB textures, copper visibility does`, async () => {
    const generation = spyOn(textureModule, "createCombinedBoardTextures")
    try {
      await withScene(async ({ root, context }) => {
        let controls: ReturnType<typeof useLayerVisibility>
        function Controls() {
          controls = useLayerVisibility()
          return null
        }
        const data: AnyCircuitElement[] = [
          {
            type: "pcb_board",
            pcb_board_id: "board",
            center: { x: 0, y: 0 },
            width: 2,
            height: 2,
            thickness: 1.6,
            num_layers: 2,
            material: "fr4",
          },
        ]
        function ManifoldTextures() {
          const { visibility } = useLayerVisibility()
          useManifoldBoardBuilder(null, data, visibility)
          return null
        }
        await act(async () =>
          root.render(
            <ThreeContext.Provider value={context}>
              <LayerVisibilityProvider>
                <Controls />
                {renderer === "jscad" ? (
                  <JscadBoardTextures circuitJson={data} pcbThickness={1.6} />
                ) : (
                  <ManifoldTextures />
                )}
              </LayerVisibilityProvider>
            </ThreeContext.Provider>,
          ),
        )
        const initial = generation.mock.calls.length
        expect(initial).toBeGreaterThan(0)
        for (const mode of ["opaque", "hidden", "translucent"] as const) {
          await act(async () => controls!.setLayerVisibility("enclosure", mode))
          expect(generation.mock.calls.length).toBe(initial)
        }
        await act(async () => controls!.setLayerVisibility("topCopper", false))
        expect(generation.mock.calls.length).toBe(initial + 1)
      })
    } finally {
      generation.mockRestore()
    }
  })
}

test("enclosure resources are released on plan replacement and StrictMode replay", async () => {
  const geometryDispose = spyOn(THREE.BufferGeometry.prototype, "dispose")
  const materialDispose = spyOn(THREE.Material.prototype, "dispose")
  try {
    await withScene(async ({ root, rootObject, context }) => {
      const render = (nextPlan: typeof plan) =>
        act(async () =>
          root.render(
            <StrictMode>
              <ThreeContext.Provider value={context}>
                <HoverContext.Provider value={hover}>
                  <JscadModel
                    jscadPlan={nextPlan}
                    isHovered={false}
                    onHover={noop}
                    onUnhover={noop}
                  />
                </HoverContext.Provider>
              </ThreeContext.Provider>
            </StrictMode>,
          ),
        )
      await render(plan)
      expect(geometryDispose.mock.calls.length).toBe(1)
      expect(materialDispose.mock.calls.length).toBe(1)
      const original = findMesh(rootObject)
      let oldGeometryDisposed = false
      original.geometry.addEventListener(
        "dispose",
        () => (oldGeometryDisposed = true),
      )
      await render({ type: "cuboid", size: [20, 8, 4] })
      expect(oldGeometryDisposed).toBe(true)
      expect(findMesh(rootObject).geometry === original.geometry).toBe(false)
      expect(geometryDispose.mock.calls.length).toBe(2)
      await act(async () => root.render(null))
      expect(geometryDispose.mock.calls.length).toBe(3)
      expect(materialDispose.mock.calls.length).toBe(3)
    })
  } finally {
    geometryDispose.mockRestore()
    materialDispose.mockRestore()
  }
})
