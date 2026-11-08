import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import {
  AssemblyExplosionContext,
  AssemblyExplosionScene,
} from "../src/assembly-explosion/AssemblyExplosionScene"
import { AssemblyExplosionControl } from "../src/assembly-explosion/AssemblyExplosionControl"
import { CameraControllerProvider } from "../src/contexts/CameraControllerContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"

test("manual Fit waits for a mounted scene and solid geometry, then runs once", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" })
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
  const reactRoot = createRoot(dom.window.document.getElementById("root")!)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(4, -5, 3)
  camera.lookAt(0, 0, 0)
  const rootObject = new THREE.Group()
  const callbacks = new Set<(time: number, delta: number) => void>()
  const context: ThreeContextState = {
    scene: new THREE.Scene(),
    camera,
    rootObject,
    renderer: {} as THREE.WebGLRenderer,
    addFrameListener: (callback) => {
      callbacks.add(callback)
    },
    removeFrameListener: (callback) => {
      callbacks.delete(callback)
    },
  }
  const fitRequested = { current: false }
  const state = { assembled: [], fitRequested }
  const tick = () => {
    for (const callback of callbacks) callback(0, 0.016)
  }
  const render = (mounted: boolean) => (
    <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
      <AssemblyExplosionContext.Provider value={state}>
        <AssemblyExplosionControl
          stages={["remove"]}
          amount={0}
          onChange={() => {}}
          onFit={() => {
            fitRequested.current = true
          }}
        />
        <ThreeContext.Provider value={context}>
          {mounted && <AssemblyExplosionScene />}
        </ThreeContext.Provider>
      </AssemblyExplosionContext.Provider>
    </CameraControllerProvider>
  )
  try {
    await act(async () => reactRoot.render(render(false)))
    const button = [...dom.window.document.querySelectorAll("button")].find(
      (button) => button.textContent === "Fit explosion",
    )!
    await act(async () => button.click())
    expect(fitRequested.current).toBe(true)
    await act(async () => reactRoot.render(render(true)))
    tick()
    expect(fitRequested.current).toBe(true)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2))
    mesh.position.set(200, 30, 10)
    rootObject.add(mesh)
    tick()
    expect(fitRequested.current).toBe(false)
    const fitPosition = camera.position.clone()
    const projectedCenter = mesh.position.clone().project(camera)
    expect(Math.abs(projectedCenter.x)).toBeLessThan(1e-8)
    expect(Math.abs(projectedCenter.y)).toBeLessThan(1e-8)
    // Scrubbing or a renderer remount must not silently auto-fit again.
    mesh.position.x = 400
    tick()
    expect(camera.position.equals(fitPosition)).toBe(true)
    await act(async () => reactRoot.render(render(false)))
    await act(async () => reactRoot.render(render(true)))
    tick()
    expect(camera.position.equals(fitPosition)).toBe(true)
    fitRequested.current = true
    tick()
    expect(camera.position.x - fitPosition.x).toBeCloseTo(200)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, previous)
    dom.window.close()
  }
})
