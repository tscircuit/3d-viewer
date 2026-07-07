import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { StrictMode } from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { BoardMeshes } from "../src/CadViewerManifold"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"

test("Manifold board textures survive a StrictMode effect replay", async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const container = document.getElementById("root")!
  const rootObject = new THREE.Object3D()
  const texture = new THREE.CanvasTexture(document.createElement("canvas"))
  const textureMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ map: texture }),
  )
  const context: ThreeContextState = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as THREE.WebGLRenderer,
    rootObject,
    addFrameListener: () => {},
    removeFrameListener: () => {},
  }
  const reactRoot = createRoot(container)

  try {
    await act(async () => {
      reactRoot.render(
        <StrictMode>
          <ThreeContext.Provider value={context}>
            <LayerVisibilityProvider>
              <BoardMeshes geometryMeshes={[]} textureMeshes={[textureMesh]} />
            </LayerVisibilityProvider>
          </ThreeContext.Provider>
        </StrictMode>,
      )
    })

    expect(rootObject.children).toEqual([textureMesh])
    expect((textureMesh.material as THREE.MeshBasicMaterial).map).toBe(texture)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
