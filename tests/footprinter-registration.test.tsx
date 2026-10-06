import { expect, test } from "bun:test"
import * as jscad from "@jscad/modeling"
import type { CadComponent } from "circuit-json"
import { getJscadModelForFootprint } from "jscad-electronics/vanilla"
import { JSDOM } from "jsdom"
import { act, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import {
  HoverContext,
  type HoverableObject,
} from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { FootprinterModel } from "../src/three-components/FootprinterModel"
import { renderComponent } from "../src/utils/render-component"
import {
  assertFootprinterMeshBuffers,
  footprinterRegistrationCases,
} from "./fixtures/footprinter-registration"

test("registered models remain synchronous in both production Three consumers", async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const previousActEnvironment = (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const rootObject = new THREE.Object3D()
  const context: ThreeContextState = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as THREE.WebGLRenderer,
    rootObject,
    addFrameListener: () => {},
    removeFrameListener: () => {},
  }
  const hoverables = new Set<THREE.Object3D>()
  const hoverContext = {
    addHoverable: ({ object }: HoverableObject) => hoverables.add(object),
    removeHoverable: (object: THREE.Object3D) => hoverables.delete(object),
  }
  const reactRoot = createRoot(document.getElementById("root")!)
  try {
    for (const fixture of footprinterRegistrationCases) {
      const result = getJscadModelForFootprint(fixture.footprint, jscad)
      expect(result instanceof Promise).toBe(false)
      expect(result.geometries.length).toBeGreaterThan(0)

      const scene = new THREE.Scene()
      const component: CadComponent = {
        type: "cad_component",
        cad_component_id: "cad_registration",
        source_component_id: "source_registration",
        pcb_component_id: "pcb_registration",
        anchor_alignment: "center",
        model_object_fit: "contain_within_bounds",
        position: { x: 4, y: -3, z: 2 },
        rotation: { x: 30, y: 60, z: 90 },
        footprinter_string: fixture.footprint,
      }
      await renderComponent(component, scene)
      expect(scene.children).toHaveLength(result.geometries.length)
      assertFootprinterMeshBuffers(scene.children, fixture.z)
      for (const mesh of scene.children) {
        expect(mesh.position.toArray()).toEqual([4, -3, 2.5])
        expect(mesh.rotation.x).toBeCloseTo(Math.PI / 6)
        expect(mesh.rotation.y).toBeCloseTo(Math.PI / 3)
        expect(mesh.rotation.z).toBeCloseTo(Math.PI / 2)
      }

      for (const isTranslucent of [false, true]) {
        await act(async () => {
          reactRoot.render(
            <StrictMode>
              <ThreeContext.Provider value={context}>
                <HoverContext.Provider value={hoverContext}>
                  <FootprinterModel
                    footprint={fixture.footprint}
                    positionOffset={[4, -3, 2]}
                    rotationOffset={[0.1, 0.2, 0.3]}
                    scale={1.25}
                    onHover={() => {}}
                    onUnhover={() => {}}
                    isHovered={false}
                    isTranslucent={isTranslucent}
                  />
                </HoverContext.Provider>
              </ThreeContext.Provider>
            </StrictMode>,
          )
        })
        expect(rootObject.children).toHaveLength(1)
        const group = rootObject.children[0]!
        expect(hoverables.size).toBe(1)
        expect(hoverables.has(group)).toBe(true)
        expect(group.children).toHaveLength(result.geometries.length)
        expect(group.position.toArray()).toEqual([4, -3, 2])
        expect(group.rotation.toArray().slice(0, 3)).toEqual([0.1, 0.2, 0.3])
        expect(group.scale.toArray()).toEqual([1.25, 1.25, 1.25])
        assertFootprinterMeshBuffers(group.children, fixture.z)
        for (const child of group.children) {
          const mesh = child as THREE.Mesh
          const material = mesh.material as THREE.MeshStandardMaterial
          expect(material.transparent).toBe(isTranslucent)
          expect(material.opacity).toBe(isTranslucent ? 0.5 : 1)
          expect(material.depthWrite).toBe(!isTranslucent)
          expect(mesh.castShadow).toBe(!isTranslucent)
          expect(mesh.receiveShadow).toBe(true)
        }
      }
      for (const child of scene.children) {
        const mesh = child as THREE.Mesh
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
    }
    await expect(
      renderComponent(
        {
          type: "cad_component",
          cad_component_id: "cad_invalid",
          source_component_id: "source_invalid",
          pcb_component_id: "pcb_invalid",
          anchor_alignment: "center",
          model_object_fit: "contain_within_bounds",
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          footprinter_string: "hexbolt_m3_l0mm",
        },
        new THREE.Scene(),
      ),
    ).rejects.toThrow()
  } finally {
    await act(async () => reactRoot.unmount())
    expect(rootObject.children).toHaveLength(0)
    expect(hoverables.size).toBe(0)
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      IS_REACT_ACT_ENVIRONMENT: previousActEnvironment,
    })
    dom.window.close()
  }
})
