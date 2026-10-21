import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import {
  CameraControllerProvider,
  useCameraController,
} from "../src/contexts/CameraControllerContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import {
  SectionProvider,
  useSection,
  type SectionState,
} from "../src/sections/SectionContext"
import { SectionScene } from "../src/sections/SectionScene"

for (const endOn of [false, true])
  test(`draggable plane updates offset and restores controls, end-on=${endOn}`, async () => {
    const dom = new JSDOM('<div id="root"></div><canvas></canvas>', {
      url: "http://localhost",
    })
    const previous = {
      window: globalThis.window,
      document: globalThis.document,
      IS_REACT_ACT_ENVIRONMENT: (globalThis as any).IS_REACT_ACT_ENVIRONMENT,
    }
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      IS_REACT_ACT_ENVIRONMENT: true,
    })
    const canvas = dom.window.document.querySelector("canvas")!
    Object.defineProperty(canvas, "clientHeight", { value: 600 })
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    canvas.setPointerCapture = () => {}
    canvas.hasPointerCapture = () => false
    const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 1000)
    camera.up.set(0, 0, 1)
    camera.position.set(
      ...((endOn ? [40, 0, 0] : [30, -40, 30]) as [number, number, number]),
    )
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    const scene = new THREE.Scene(),
      rootObject = new THREE.Group()
    scene.add(rootObject)
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(20, 20, 20),
      new THREE.MeshBasicMaterial(),
    )
    rootObject.add(mesh)
    let frame = () => {}
    let state: SectionState | null = null
    const controls = {
      enabled: true,
      autoRotate: true,
      target: new THREE.Vector3(),
      update() {},
    }
    const context: ThreeContextState = {
      scene,
      camera,
      rootObject,
      renderer: {
        domElement: canvas,
        localClippingEnabled: false,
      } as unknown as THREE.WebGLRenderer,
      addFrameListener: (listener) => {
        frame = () => listener(0, 0)
      },
      removeFrameListener: () => {
        frame = () => {}
      },
    }
    function Probe() {
      state = useSection()
      useCameraController().controlsRef.current = controls as any
      return null
    }
    const reactRoot = createRoot(document.getElementById("root")!)
    const step = async () => {
      await act(async () => {
        frame()
        await new Promise((r) => setTimeout(r, 90))
        frame()
      })
      scene.updateMatrixWorld(true)
    }
    const pointer = (name: string, x: number, y: number) => {
      const event = new dom.window.MouseEvent(name, {
        clientX: x,
        clientY: y,
        button: 0,
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, "pointerId", { value: 1 })
      canvas.dispatchEvent(event)
    }
    try {
      await act(async () => {
        reactRoot.render(
          <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
            <SectionProvider>
              <ThreeContext.Provider value={context}>
                <Probe />
                <SectionScene />
              </ThreeContext.Provider>
            </SectionProvider>
          </CameraControllerProvider>,
        )
      })
      await step()
      await act(async () => {
        state!.setSpec({ axis: "x", offset: 0, flipped: false })
        state!.setEditing(true)
      })
      await step()
      const originalCamera = camera.matrixWorld.clone()
      await act(async () => pointer("pointerdown", 400, 300))
      expect(controls.enabled).toBe(false)
      expect(controls.autoRotate).toBe(false)
      await act(async () => pointer("pointermove", 440, 260))
      expect(state!.spec!.offset).not.toBe(0)
      expect(camera.matrixWorld.equals(originalCamera)).toBe(true)
      await act(async () => pointer("pointerup", 440, 260))
      expect(controls.enabled).toBe(true)
      expect(controls.autoRotate).toBe(true)
      expect(mesh.material.clippingPlanes).toHaveLength(1)
      await act(async () => {
        state!.setSpec(null)
        state!.setEditing(false)
      })
      await step()
      expect(mesh.material.clippingPlanes).toBeNull()
    } finally {
      await act(async () => reactRoot.unmount())
      Object.assign(globalThis, previous)
      dom.window.close()
    }
  })
