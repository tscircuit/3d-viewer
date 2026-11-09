import { expect, test } from "bun:test"
import "bun-match-svg"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import { act, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg"
import { HoverContext } from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { FootprinterModel } from "../src/three-components/FootprinterModel"
import { applyJsdomShim } from "../src/utils/jsdom-shim"

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
  const createElement = dom.window.document.createElement.bind(
    dom.window.document,
  )
  dom.window.document.createElement = ((tag: string, options: any) =>
    tag === "canvas" ? createCanvas(1, 1) : createElement(tag, options)) as any
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
    if (previousWindow === undefined) {
      delete (globalThis as any).window
    } else {
      globalThis.window = previousWindow
    }
    if (previousDocument === undefined) {
      delete (globalThis as any).document
    } else {
      globalThis.document = previousDocument
    }
    ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false
    dom.window.close()
  }
}

const hover = { addHoverable: () => {}, removeHoverable: () => {} }
const noop = () => {}

function findMeshes(root: THREE.Object3D) {
  const meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] =
    []
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes.push(
        object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
      )
    }
  })
  return meshes
}

test("unmounting FootprinterModel disposes mesh geometries and materials", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    await act(async () =>
      root.render(
        <ThreeContext.Provider value={context}>
          <HoverContext.Provider value={hover}>
            <FootprinterModel
              footprint="0402"
              positionOffset={[0, 0, 0]}
              isHovered={false}
              onHover={noop}
              onUnhover={noop}
            />
          </HoverContext.Provider>
        </ThreeContext.Provider>,
      ),
    )

    const meshes = findMeshes(rootObject)
    expect(meshes.length).toBeGreaterThan(0)

    let disposedGeometries = 0
    let disposedMaterials = 0
    for (const mesh of meshes) {
      mesh.geometry.addEventListener("dispose", () => {
        disposedGeometries++
      })
      mesh.material.addEventListener("dispose", () => {
        disposedMaterials++
      })
    }

    await act(async () => root.render(null))
    expect(rootObject.children).toHaveLength(0)
    expect(disposedGeometries).toBe(meshes.length)
    expect(disposedMaterials).toBe(meshes.length)
  })
})

test("changing FootprinterModel translucency preserves geometries and releases on replacement", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    const render = (footprint: string, translucent: boolean) =>
      act(async () =>
        root.render(
          <StrictMode>
            <ThreeContext.Provider value={context}>
              <HoverContext.Provider value={hover}>
                <FootprinterModel
                  footprint={footprint}
                  positionOffset={[1, 2, 0]}
                  isTranslucent={translucent}
                  isHovered={false}
                  onHover={noop}
                  onUnhover={noop}
                />
              </HoverContext.Provider>
            </ThreeContext.Provider>
          </StrictMode>,
        ),
      )

    await render("0402", false)
    const initialMeshes = findMeshes(rootObject)
    expect(initialMeshes.length).toBeGreaterThan(0)
    const initialGeometries = initialMeshes.map((m) => m.geometry)

    let initialDisposed = 0
    for (const geom of initialGeometries) {
      geom.addEventListener("dispose", () => {
        initialDisposed++
      })
    }

    await render("0402", true)
    const translucentMeshes = findMeshes(rootObject)
    expect(translucentMeshes.map((m) => m.geometry)).toEqual(initialGeometries)
    expect(initialDisposed).toBe(0)
    for (const mesh of translucentMeshes) {
      expect(mesh.material.transparent).toBe(true)
      expect(mesh.material.opacity).toBe(0.5)
      expect(mesh.material.depthWrite).toBe(false)
    }

    await render("soic8", false)
    expect(initialDisposed).toBe(initialGeometries.length)
    const replacedMeshes = findMeshes(rootObject)
    expect(replacedMeshes.length).toBeGreaterThan(0)
    for (const mesh of replacedMeshes) {
      expect(mesh.material.transparent).toBe(false)
      expect(mesh.material.opacity).toBe(1)
    }
  })
})

test("renders footprinter 3D models on board SVG snapshot", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  try {
    const circuitJson = [
      {
        type: "pcb_board",
        pcb_board_id: "board_fp",
        center: { x: 0, y: 0 },
        width: 14,
        height: 10,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
      },
      {
        type: "source_component",
        source_component_id: "src_r1",
        name: "R1",
        ftype: "simple_resistor",
        resistance: 1000,
      },
      {
        type: "pcb_component",
        pcb_component_id: "pcb_r1",
        source_component_id: "src_r1",
        center: { x: -3.5, y: 0 },
        width: 1.6,
        height: 0.8,
        layer: "top",
        rotation: 0,
      },
      {
        type: "cad_component",
        cad_component_id: "cad_r1",
        pcb_component_id: "pcb_r1",
        source_component_id: "src_r1",
        position: { x: -3.5, y: 0, z: 0.8 },
        rotation: { x: 0, y: 0, z: 0 },
        footprinter_string: "0603",
      },
      {
        type: "source_component",
        source_component_id: "src_u1",
        name: "U1",
        ftype: "simple_chip",
      },
      {
        type: "pcb_component",
        pcb_component_id: "pcb_u1",
        source_component_id: "src_u1",
        center: { x: 2.5, y: 0 },
        width: 5,
        height: 4,
        layer: "top",
        rotation: 0,
      },
      {
        type: "cad_component",
        cad_component_id: "cad_u1",
        pcb_component_id: "pcb_u1",
        source_component_id: "src_u1",
        position: { x: 2.5, y: 0, z: 0.8 },
        rotation: { x: 0, y: 0, z: 0 },
        footprinter_string: "soic8",
      },
    ] as AnyCircuitElement[]

    const svg = await convertCircuitJsonTo3dSvg(circuitJson, {
      width: 600,
      height: 450,
      zoom: 4,
      camera: {
        position: { x: 12, y: -14, z: 16 },
        lookAt: { x: 0, y: 0, z: 0 },
      },
    })

    await expect(svg).toMatchSvgSnapshot(import.meta.path)
  } finally {
    dom.window.close()
  }
})
