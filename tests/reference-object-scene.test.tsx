import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { JSDOM } from "jsdom"
import { act, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import type { ReferenceObjectType } from "../src/reference-objects/reference-object"
import { ReferenceObject } from "../src/three-components/reference-object"

test("mounts and disposes reference object labels with the scene geometry", async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const drawnText: string[] = []
  dom.window.HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
  ) {
    const context = createCanvas(this.width, this.height).getContext("2d")
    const fillText = context.fillText.bind(context)
    context.fillText = (text, x, y) => {
      drawnText.push(text)
      fillText(text, x, y)
    }
    return context
  } as unknown as HTMLCanvasElement["getContext"]
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

  const renderReference = async (type: ReferenceObjectType | null) => {
    await act(async () => {
      reactRoot.render(
        <StrictMode>
          <ThreeContext.Provider value={context}>
            {type && (
              <ReferenceObject
                type={type}
                boardDimensions={{ width: 30, height: 20 }}
                boardCenter={{ x: 0, y: 0 }}
              />
            )}
          </ThreeContext.Provider>
        </StrictMode>,
      )
    })
  }

  try {
    for (const [type, name, dimensions] of [
      ["credit-card", "Credit card", "85.6 × 53.98 mm"],
      ["banana", "Banana", "190 × 60 mm"],
      ["14in-macbook", "14-inch MacBook Pro", "312.6 × 221.2 mm"],
    ] as const) {
      await renderReference(type)

      const object = scene.getObjectByName(`reference-object-${type}`)!
      const label = object.getObjectByName("reference-object-label") as
        | THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
        | undefined
      expect(label).toBeDefined()
      expect(label!.geometry.getAttribute("position").count).toBeGreaterThan(0)
      expect(drawnText.slice(-2)).toEqual([name, dimensions])
      expect(label!.castShadow).toBe(false)
      expect(rootObject.children).toHaveLength(0)

      let textureDisposed = false
      label!.material.map!.addEventListener("dispose", () => {
        textureDisposed = true
      })
      await renderReference(null)

      expect(object.parent).toBeNull()
      expect(textureDisposed).toBe(true)
    }
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
