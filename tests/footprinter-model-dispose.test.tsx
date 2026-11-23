import { expect, spyOn, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { HoverContext } from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import {
  disposeFootprinterGroup,
  FootprinterModel,
} from "../src/three-components/FootprinterModel"

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

function collectMeshes(root: THREE.Object3D) {
  const meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] =
    []
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes.push(
        object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
      )
    }
  })
  return meshes
}

test("unmounting FootprinterModel disposes all geometries and materials", async () => {
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

    const meshes = collectMeshes(rootObject)
    expect(meshes.length).toBeGreaterThan(0)

    let geometriesDisposed = 0
    let materialsDisposed = 0
    for (const mesh of meshes) {
      mesh.geometry.addEventListener("dispose", () => geometriesDisposed++)
      mesh.material.addEventListener("dispose", () => materialsDisposed++)
    }

    await act(async () => root.render(null))
    expect(rootObject.children).toHaveLength(0)
    expect(geometriesDisposed).toBe(meshes.length)
    expect(materialsDisposed).toBe(meshes.length)
  })
})

test("changing footprint disposes previous resources and handles StrictMode replay", async () => {
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
      const initialMeshes = collectMeshes(rootObject)
      expect(initialMeshes.length).toBeGreaterThan(0)
      // StrictMode replay should have disposed the first mount's resources
      expect(geometryDispose.mock.calls.length).toBe(initialMeshes.length)
      expect(materialDispose.mock.calls.length).toBe(initialMeshes.length)

      let oldGeometriesDisposed = 0
      let oldMaterialsDisposed = 0
      for (const mesh of initialMeshes) {
        mesh.geometry.addEventListener("dispose", () => oldGeometriesDisposed++)
        mesh.material.addEventListener("dispose", () => oldMaterialsDisposed++)
      }

      await render("0603")
      expect(oldGeometriesDisposed).toBe(initialMeshes.length)
      expect(oldMaterialsDisposed).toBe(initialMeshes.length)

      const replacedMeshes = collectMeshes(rootObject)
      expect(replacedMeshes.length).toBeGreaterThan(0)
      expect(replacedMeshes[0]!.geometry).not.toBe(initialMeshes[0]!.geometry)

      const countBeforeUnmount = geometryDispose.mock.calls.length
      await act(async () => root.render(null))
      expect(geometryDispose.mock.calls.length).toBe(
        countBeforeUnmount + replacedMeshes.length,
      )
    })
  } finally {
    geometryDispose.mockRestore()
    materialDispose.mockRestore()
  }
})

test("toggling isTranslucent preserves geometries and materials without disposing", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    const render = (isTranslucent: boolean) =>
      act(async () =>
        root.render(
          <ThreeContext.Provider value={context}>
            <HoverContext.Provider value={hover}>
              <FootprinterModel
                footprint="0402"
                positionOffset={[0, 0, 0]}
                isTranslucent={isTranslucent}
                isHovered={false}
                onHover={noop}
                onUnhover={noop}
              />
            </HoverContext.Provider>
          </ThreeContext.Provider>,
        ),
      )

    await render(false)
    const initialMeshes = collectMeshes(rootObject)
    expect(initialMeshes.length).toBeGreaterThan(0)

    let disposed = 0
    for (const mesh of initialMeshes) {
      mesh.geometry.addEventListener("dispose", () => disposed++)
      mesh.material.addEventListener("dispose", () => disposed++)
    }

    await render(true)
    const translucentMeshes = collectMeshes(rootObject)
    expect(disposed).toBe(0)
    expect(translucentMeshes.map((m) => m.geometry)).toEqual(
      initialMeshes.map((m) => m.geometry),
    )
    for (const mesh of translucentMeshes) {
      expect(mesh.material.transparent).toBe(true)
      expect(mesh.material.opacity).toBe(0.5)
      expect(mesh.material.depthWrite).toBe(false)
    }

    await render(false)
    expect(disposed).toBe(0)
    for (const mesh of collectMeshes(rootObject)) {
      expect(mesh.material.transparent).toBe(false)
      expect(mesh.material.opacity).toBe(1)
      expect(mesh.material.depthWrite).toBe(true)
    }
  })
})

test("changing rootObject moves group without prematurely disposing resources", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    const renderWithContext = (ctx: ThreeContextState) =>
      act(async () =>
        root.render(
          <ThreeContext.Provider value={ctx}>
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

    await renderWithContext(context)
    const meshes = collectMeshes(rootObject)
    expect(meshes.length).toBeGreaterThan(0)

    let disposed = 0
    for (const mesh of meshes) {
      mesh.geometry.addEventListener("dispose", () => disposed++)
      mesh.material.addEventListener("dispose", () => disposed++)
    }

    const nextRootObject = new THREE.Object3D()
    await renderWithContext({ ...context, rootObject: nextRootObject })
    expect(rootObject.children).toHaveLength(0)
    expect(nextRootObject.children).toHaveLength(1)
    expect(disposed).toBe(0)
  })
})

test("disposeFootprinterGroup disposes unique geometries, material arrays, and textures once", () => {
  const sharedGeometry = new THREE.BoxGeometry(1, 1, 1)
  const sharedTexture = new THREE.Texture()
  const matA = new THREE.MeshStandardMaterial({ map: sharedTexture })
  const matB = new THREE.MeshStandardMaterial({ map: sharedTexture })

  let geomDisposed = 0
  let texDisposed = 0
  let matADisposed = 0
  let matBDisposed = 0
  sharedGeometry.addEventListener("dispose", () => geomDisposed++)
  sharedTexture.addEventListener("dispose", () => texDisposed++)
  matA.addEventListener("dispose", () => matADisposed++)
  matB.addEventListener("dispose", () => matBDisposed++)

  const group = new THREE.Group()
  group.add(new THREE.Mesh(sharedGeometry, [matA, matB]))
  group.add(new THREE.Mesh(sharedGeometry, matA))

  disposeFootprinterGroup(group)

  expect(geomDisposed).toBe(1)
  expect(texDisposed).toBe(1)
  expect(matADisposed).toBe(1)
  expect(matBDisposed).toBe(1)
})
