import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { ReferenceObject } from "../src/three-components/reference-object"

test("adds reference geometry to the scene but not the export root", async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const container = document.getElementById("root")!
  const scene = new THREE.Scene()
  const rootObject = new THREE.Object3D()
  scene.add(rootObject)
  const context: ThreeContextState = {
    scene,
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
            <ReferenceObject
              type="credit-card"
              boardDimensions={{ width: 30, height: 20 }}
              boardCenter={{ x: 0, y: 0 }}
            />
          </ThreeContext.Provider>
        </StrictMode>,
      )
    })

    expect(scene.getObjectByName("reference-object-credit-card")).toBeTruthy()
    expect(rootObject.children).toHaveLength(0)
  } finally {
    await act(async () => reactRoot.unmount())
    expect(scene.getObjectByName("reference-object-credit-card")).toBeFalsy()
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
