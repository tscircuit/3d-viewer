import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
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

function getMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes.push(object)
    }
  })
  return meshes
}

test("FootprinterModel disposes mesh geometries and materials on unmount and footprint change", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    const render = (footprint: string) =>
      act(async () =>
        root.render(
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
          </ThreeContext.Provider>,
        ),
      )

    await render("0402")
    const initialMeshes = getMeshes(rootObject)
    expect(initialMeshes.length).toBeGreaterThan(0)

    let disposedGeometries = 0
    let disposedMaterials = 0
    for (const mesh of initialMeshes) {
      mesh.geometry.addEventListener("dispose", () => {
        disposedGeometries++
      })
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]
      for (const material of materials) {
        material.addEventListener("dispose", () => {
          disposedMaterials++
        })
      }
    }

    await render("0805")
    expect(disposedGeometries).toBe(initialMeshes.length)
    expect(disposedMaterials).toBe(initialMeshes.length)

    const replacementMeshes = getMeshes(rootObject)
    expect(replacementMeshes.length).toBeGreaterThan(0)

    let replacementDisposedGeometries = 0
    let replacementDisposedMaterials = 0
    for (const mesh of replacementMeshes) {
      mesh.geometry.addEventListener("dispose", () => {
        replacementDisposedGeometries++
      })
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]
      for (const material of materials) {
        material.addEventListener("dispose", () => {
          replacementDisposedMaterials++
        })
      }
    }

    await act(async () => root.render(null))
    expect(rootObject.children).toHaveLength(0)
    expect(replacementDisposedGeometries).toBe(replacementMeshes.length)
    expect(replacementDisposedMaterials).toBe(replacementMeshes.length)
  })
})
