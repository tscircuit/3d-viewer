import { expect, spyOn, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { JSDOM } from "jsdom"
import { act, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { HoverContext } from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { FootprinterModel } from "../src/three-components/FootprinterModel"

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

const hover = { addHoverable: () => {}, removeHoverable: () => {} }
const noop = () => {}

function findMeshes(root: THREE.Object3D) {
  const meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] =
    []
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes.push(object as (typeof meshes)[number])
    }
  })
  if (meshes.length === 0) throw new Error("Missing footprinter meshes")
  return meshes
}

test("changing FootprinterModel transparency preserves its geometries", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    const render = (translucent: boolean) =>
      act(async () =>
        root.render(
          <ThreeContext.Provider value={context}>
            <HoverContext.Provider value={hover}>
              <FootprinterModel
                footprint="0402"
                positionOffset={[0, 0, 0]}
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
    const initialMeshes = findMeshes(rootObject)
    const initialGeometries = initialMeshes.map((m) => m.geometry)

    await render(true)
    const translucentMeshes = findMeshes(rootObject)
    expect(translucentMeshes.map((m) => m.geometry)).toEqual(initialGeometries)
    for (const mesh of translucentMeshes) {
      expect(mesh.material.transparent).toBe(true)
      expect(mesh.material.opacity).toBe(0.5)
      expect(mesh.material.depthWrite).toBe(false)
      expect(mesh.renderOrder).toBe(2)
    }

    await render(false)
    const opaqueMeshes = findMeshes(rootObject)
    expect(opaqueMeshes.map((m) => m.geometry)).toEqual(initialGeometries)
    for (const mesh of opaqueMeshes) {
      expect(mesh.material.transparent).toBe(false)
      expect(mesh.material.opacity).toBe(1)
      expect(mesh.material.depthWrite).toBe(true)
      expect(mesh.renderOrder).toBe(1)
    }
  })
})

test("unmounting FootprinterModel releases geometries and materials", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    await act(async () =>
      root.render(
        <ThreeContext.Provider value={context}>
          <HoverContext.Provider value={hover}>
            <FootprinterModel
              footprint="0402"
              positionOffset={[0, 0, 0]}
              isHovered={false}
              onHover={noop}
              onUnhover={noop}
            />
          </HoverContext.Provider>
        </ThreeContext.Provider>,
      ),
    )
    const meshes = findMeshes(rootObject)
    let geometryDisposed = 0
    let materialDisposed = 0
    for (const mesh of meshes) {
      mesh.geometry.addEventListener("dispose", () => geometryDisposed++)
      mesh.material.addEventListener("dispose", () => materialDisposed++)
    }

    await act(async () => root.render(null))
    expect(rootObject.children).toHaveLength(0)
    expect(geometryDisposed).toBe(meshes.length)
    expect(materialDisposed).toBe(meshes.length)
  })
})

test("FootprinterModel resources are released on footprint replacement and StrictMode replay", async () => {
  const geometryDispose = spyOn(THREE.BufferGeometry.prototype, "dispose")
  const materialDispose = spyOn(THREE.Material.prototype, "dispose")
  try {
    await withScene(async ({ root, rootObject, context }) => {
      const render = (footprint: string) =>
        act(async () =>
          root.render(
            <StrictMode>
              <ThreeContext.Provider value={context}>
                <HoverContext.Provider value={hover}>
                  <FootprinterModel
                    footprint={footprint}
                    positionOffset={[0, 0, 0]}
                    isHovered={false}
                    onHover={noop}
                    onUnhover={noop}
                  />
                </HoverContext.Provider>
              </ThreeContext.Provider>
            </StrictMode>,
          ),
        )

      await render("0402")
      const firstMeshes = findMeshes(rootObject)
      expect(geometryDispose.mock.calls.length).toBe(firstMeshes.length)
      expect(materialDispose.mock.calls.length).toBe(firstMeshes.length)

      let oldDisposedCount = 0
      for (const mesh of firstMeshes) {
        mesh.geometry.addEventListener("dispose", () => oldDisposedCount++)
      }

      await render("0805")
      const secondMeshes = findMeshes(rootObject)
      expect(oldDisposedCount).toBe(firstMeshes.length)
      expect(secondMeshes[0]?.geometry === firstMeshes[0]?.geometry).toBe(false)

      await act(async () => root.render(null))
      expect(geometryDispose.mock.calls.length).toBe(
        firstMeshes.length * 2 + secondMeshes.length,
      )
      expect(materialDispose.mock.calls.length).toBe(
        firstMeshes.length * 2 + secondMeshes.length,
      )
    })
  } finally {
    geometryDispose.mockRestore()
    materialDispose.mockRestore()
  }
})
