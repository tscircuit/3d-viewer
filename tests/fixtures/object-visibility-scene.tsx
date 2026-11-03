import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { CameraControllerProvider } from "../../src/contexts/CameraControllerContext"
import { LayerVisibilityProvider } from "../../src/contexts/LayerVisibilityContext"
import { HoverContext } from "../../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../../src/react-three/ThreeContext"

/** A JSDOM page and a bare Three scene for rendering scene components in
 * tests. The camera's 200 px canvas center is `center`. */
export const setupObjectVisibilityScene = () => {
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

export const center = { x: 100, y: 100 }
