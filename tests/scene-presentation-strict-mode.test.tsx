import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { ScenePresentation } from "../src/three-components/ScenePresentation"

test("one parent moves board, display and late-loaded cables together and resets when unfolded", async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previousWindow = globalThis.window,
    previousDocument = globalThis.document
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const rootObject = new THREE.Object3D()
  const board = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2))
  const display = new THREE.Object3D()
  display.position.set(1, 2, -5)
  rootObject.add(board, display)
  const bytes = board.geometry.getAttribute("position").array.slice()
  const matrix = new THREE.Matrix4()
    .makeRotationX(Math.PI)
    .setPosition(0, -10, -4)
  const context: ThreeContextState = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as THREE.WebGLRenderer,
    rootObject,
    addFrameListener: () => {},
    removeFrameListener: () => {},
  }
  const reactRoot = createRoot(document.getElementById("root")!)
  const render = (transform?: THREE.Matrix4) =>
    act(async () => {
      reactRoot.render(
        <StrictMode>
          <ThreeContext.Provider value={context}>
            <ScenePresentation matrix={transform} />
          </ThreeContext.Provider>
        </StrictMode>,
      )
    })
  try {
    await render(matrix)
    const cable = new THREE.Object3D()
    cable.position.set(-3, 4, 1)
    rootObject.add(cable)
    rootObject.updateMatrixWorld(true)
    for (const part of [board, display, cable]) {
      const expected = part.position.clone().applyMatrix4(matrix)
      expect(
        part.getWorldPosition(new THREE.Vector3()).distanceTo(expected),
      ).toBeLessThan(1e-10)
    }
    expect(display.position.toArray()).toEqual([1, 2, -5])
    expect(board.geometry.getAttribute("position").array).toEqual(bytes)
    await render()
    expect(rootObject.matrix.equals(new THREE.Matrix4())).toBe(true)
    expect(rootObject.children).toEqual([board, display, cable])
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
    board.geometry.dispose()
  }
})
