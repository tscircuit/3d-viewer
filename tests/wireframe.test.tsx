import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import {
  AppearanceProvider,
  useAppearance,
} from "../src/contexts/appearance-context"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { Wireframe } from "../src/react-three/Wireframe"

test("wireframe covers late meshes and material replacements, restores surfaces, and cleans up", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" })
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const scene = new THREE.Scene()
  const rootObject = new THREE.Object3D()
  const frames = new Set<(time: number, delta: number) => void>()
  const context: ThreeContextState = {
    scene,
    rootObject,
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as THREE.WebGLRenderer,
    addFrameListener: (listener) => frames.add(listener),
    removeFrameListener: (listener) => frames.delete(listener),
  }
  const material = new THREE.MeshStandardMaterial({ color: "green" })
  const texture = new THREE.Texture()
  material.map = texture
  const preexistingWireframe = new THREE.MeshBasicMaterial({ wireframe: true })
  const geometry = new THREE.BoxGeometry()
  const mesh = new THREE.Mesh(geometry, [material, preexistingWireframe])
  rootObject.add(mesh)
  const helperMaterial = new THREE.ShaderMaterial()
  const helper = new THREE.Mesh(geometry, helperMaterial)
  scene.add(rootObject, helper)

  let appearance: ReturnType<typeof useAppearance>
  const Controls = () => {
    appearance = useAppearance()
    return null
  }
  const root = createRoot(document.getElementById("root")!)
  const frame = () => frames.forEach((listener) => listener(0, 0))

  try {
    await act(async () => {
      root.render(
        <StrictMode>
          <AppearanceProvider>
            <Controls />
            <ThreeContext.Provider value={context}>
              <Wireframe />
            </ThreeContext.Provider>
          </AppearanceProvider>
        </StrictMode>,
      )
    })
    expect(appearance!.wireframeEnabled).toBe(false)
    expect(material.wireframe).toBe(false)
    expect(frames.size).toBe(0)

    await act(async () => appearance!.setWireframeEnabled(true))
    frame()
    expect(material.wireframe).toBe(true)
    expect(material.map).toBe(texture)
    expect(material.color.getHexString()).toBe("008000")
    expect(mesh.geometry).toBe(geometry)
    expect(helperMaterial.wireframe).toBe(false)
    expect(frames.size).toBe(1)

    const lateMaterial = new THREE.MeshPhongMaterial()
    const lateMesh = new THREE.Mesh(geometry, lateMaterial)
    rootObject.add(new THREE.Group().add(lateMesh))
    frame()
    expect(lateMaterial.wireframe).toBe(true)

    const replacement = new THREE.MeshPhongMaterial()
    lateMesh.material = replacement
    frame()
    expect(replacement.wireframe).toBe(true)
    rootObject.remove(mesh)

    await act(async () => appearance!.setWireframeEnabled(false))
    expect(material.wireframe).toBe(false)
    expect(preexistingWireframe.wireframe).toBe(true)
    expect(lateMaterial.wireframe).toBe(false)
    expect(replacement.wireframe).toBe(false)
    expect(material.map).toBe(texture)
    expect(frames.size).toBe(0)

    await act(async () => appearance!.setWireframeEnabled(true))
    frame()
    expect(replacement.wireframe).toBe(true)
    await act(async () => root.render(null))
    expect(replacement.wireframe).toBe(false)
    expect(frames.size).toBe(0)
  } finally {
    await act(async () => root.unmount())
    geometry.dispose()
    texture.dispose()
    Object.assign(globalThis, {
      ...previousGlobals,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
