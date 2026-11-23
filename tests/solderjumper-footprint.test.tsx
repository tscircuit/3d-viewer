import { afterEach, beforeEach, expect, test } from "bun:test"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import * as THREE from "three"
import { AnyCadComponent } from "../src/AnyCadComponent"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg"
import { HoverContext } from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { Error3d } from "../src/three-components/Error3d"
import {
  FootprinterModel,
  isFootprintWithout3dModel,
} from "../src/three-components/FootprinterModel"
import { ThreeErrorBoundary } from "../src/three-components/ThreeErrorBoundary"
import { applyJsdomShim } from "../src/utils/jsdom-shim"
import { renderComponent } from "../src/utils/render-component"

const asciiStl = `solid triangle
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid triangle`

let dom: JSDOM
let reactRoot: Root
let sceneRoot: THREE.Object3D
let previousWindow: typeof globalThis.window
let previousDocument: typeof globalThis.document

beforeEach(() => {
  dom = new JSDOM('<div id="root"></div>')
  previousWindow = globalThis.window
  previousDocument = globalThis.document
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  window.TSCIRCUIT_MODEL_LOADER_CACHE = new Map()
  reactRoot = createRoot(document.getElementById("root")!)
  sceneRoot = new THREE.Object3D()
})

afterEach(async () => {
  await act(async () => reactRoot.unmount())
  Object.assign(globalThis, {
    window: previousWindow,
    document: previousDocument,
    IS_REACT_ACT_ENVIRONMENT: false,
  })
  dom.window.close()
})

const createThreeContext = (): ThreeContextState => ({
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(),
  renderer: {} as THREE.WebGLRenderer,
  rootObject: sceneRoot,
  addFrameListener: () => {},
  removeFrameListener: () => {},
})

const makeCadComponent = (
  overrides: Partial<CadComponent> &
    Pick<CadComponent, "cad_component_id" | "source_component_id">,
): CadComponent => ({
  type: "cad_component",
  position: { x: 0, y: 0, z: 0.7 },
  rotation: { x: 0, y: 0, z: 0 },
  anchor_alignment: "center",
  model_object_fit: "contain_within_bounds",
  ...overrides,
})

test("identifies copper-only 2D footprints without matching 3D IC packages", () => {
  expect(isFootprintWithout3dModel("solderjumper")).toBe(true)
  expect(isFootprintWithout3dModel("solderjumper2")).toBe(true)
  expect(isFootprintWithout3dModel("solderjumper3_bridged123")).toBe(true)
  expect(
    isFootprintWithout3dModel(
      "solderjumper2_bridged12_p1.0414_pw0.6604_ph1.27",
    ),
  ).toBe(true)
  expect(isFootprintWithout3dModel("fiducial")).toBe(true)
  expect(isFootprintWithout3dModel("fiducial_d1mm")).toBe(true)
  expect(isFootprintWithout3dModel("pad")).toBe(true)
  expect(isFootprintWithout3dModel("smtpad")).toBe(true)
  expect(isFootprintWithout3dModel("smdpads")).toBe(true)
  expect(isFootprintWithout3dModel("platedhole")).toBe(true)
  expect(isFootprintWithout3dModel("")).toBe(true)
  expect(isFootprintWithout3dModel(undefined)).toBe(true)

  expect(isFootprintWithout3dModel("0402")).toBe(false)
  expect(isFootprintWithout3dModel("0603")).toBe(false)
  expect(isFootprintWithout3dModel("soic8")).toBe(false)
  expect(isFootprintWithout3dModel("qfn16")).toBe(false)
  expect(isFootprintWithout3dModel("dip8")).toBe(false)
  expect(isFootprintWithout3dModel("pinrow4")).toBe(false)
})

test("skips 3D CAD package generation for solderjumper and fiducial without triggering Error3d", async () => {
  const solderjumperCad = makeCadComponent({
    cad_component_id: "cad_sj1",
    pcb_component_id: "pcb_sj1",
    source_component_id: "src_sj1",
    footprinter_string: "solderjumper2_bridged12_p1.0414_pw0.6604_ph1.27",
    position: { x: -2, y: 0, z: 0.7 },
  })
  const fiducialCad = makeCadComponent({
    cad_component_id: "cad_fid1",
    pcb_component_id: "pcb_fid1",
    source_component_id: "src_fid1",
    footprinter_string: "fiducial",
    position: { x: 0, y: 2, z: 0.7 },
  })
  const resistorCad = makeCadComponent({
    cad_component_id: "cad_r1",
    pcb_component_id: "pcb_r1",
    source_component_id: "src_r1",
    footprinter_string: "0402",
    position: { x: 2, y: 0, z: 0.7 },
  })
  const allComponents = [solderjumperCad, fiducialCad, resistorCad]
  const errorsCaught: string[] = []

  await act(async () => {
    reactRoot.render(
      <ThreeContext.Provider value={createThreeContext()}>
        <HoverContext.Provider
          value={{ addHoverable: () => {}, removeHoverable: () => {} }}
        >
          <LayerVisibilityProvider>
            {allComponents.map((cad) => (
              <ThreeErrorBoundary
                key={cad.cad_component_id}
                fallback={({ error }) => {
                  errorsCaught.push(`${cad.cad_component_id}:${error.message}`)
                  return <Error3d cad_component={cad} error={error} />
                }}
              >
                <AnyCadComponent
                  cad_component={cad}
                  circuitJson={allComponents}
                />
              </ThreeErrorBoundary>
            ))}
            <FootprinterModel
              positionOffset={[0, 0, 0]}
              footprint="solderjumper2"
              onHover={() => {}}
              onUnhover={() => {}}
              isHovered={false}
            />
          </LayerVisibilityProvider>
        </HoverContext.Provider>
      </ThreeContext.Provider>,
    )
  })

  expect(errorsCaught).toEqual([])

  const cadComponentIdsInScene: string[] = []
  let errorBoxCount = 0
  let totalMeshes = 0
  sceneRoot.traverse((obj) => {
    if (obj.userData?.cad_component_id) {
      cadComponentIdsInScene.push(obj.userData.cad_component_id)
    }
    if (obj instanceof THREE.Mesh) {
      totalMeshes += 1
      if (obj.renderOrder === 999999) {
        errorBoxCount += 1
      }
    }
  })

  expect(errorBoxCount).toBe(0)
  expect(cadComponentIdsInScene).toEqual(["cad_r1"])
  expect(totalMeshes).toBeGreaterThan(0)
})

test("preserves Error3d reporting for genuinely invalid 3D footprints", async () => {
  const invalidCad = makeCadComponent({
    cad_component_id: "cad_bad",
    pcb_component_id: "pcb_bad",
    source_component_id: "src_bad",
    footprinter_string: "nonexistent_invalid_pkg_xyz",
  })
  const errorsCaught: string[] = []
  const prevError = console.error
  console.error = () => {}

  try {
    await act(async () => {
      reactRoot.render(
        <ThreeContext.Provider value={createThreeContext()}>
          <HoverContext.Provider
            value={{ addHoverable: () => {}, removeHoverable: () => {} }}
          >
            <LayerVisibilityProvider>
              <ThreeErrorBoundary
                fallback={({ error }) => {
                  errorsCaught.push(error.message)
                  return null
                }}
              >
                <AnyCadComponent
                  cad_component={invalidCad}
                  circuitJson={[invalidCad]}
                />
              </ThreeErrorBoundary>
            </LayerVisibilityProvider>
          </HoverContext.Provider>
        </ThreeContext.Provider>,
      )
    })
  } finally {
    console.error = prevError
  }

  expect(errorsCaught.length).toBeGreaterThan(0)
})

test("still renders explicit custom 3D models attached to a solderjumper component", async () => {
  const customModelSolderjumper = makeCadComponent({
    cad_component_id: "cad_sj_custom",
    source_component_id: "src_sj_custom",
    footprinter_string: "solderjumper2",
    model_stl_url: `data:model/stl,${encodeURIComponent(asciiStl)}`,
    position: { x: 0, y: 0, z: 0 },
  })

  await act(async () => {
    reactRoot.render(
      <ThreeContext.Provider value={createThreeContext()}>
        <HoverContext.Provider
          value={{ addHoverable: () => {}, removeHoverable: () => {} }}
        >
          <LayerVisibilityProvider>
            <AnyCadComponent
              cad_component={customModelSolderjumper}
              circuitJson={[customModelSolderjumper]}
            />
          </LayerVisibilityProvider>
        </HoverContext.Provider>
      </ThreeContext.Provider>,
    )
  })

  const mesh = sceneRoot.getObjectByProperty("type", "Mesh") as THREE.Mesh
  expect(mesh).toBeDefined()
  expect(mesh.geometry.getAttribute("position").count).toBe(3)
})

test("renderComponent and convertCircuitJsonTo3dSvg skip 2D-only footprints without error cubes", async () => {
  applyJsdomShim(dom)
  const scene = new THREE.Scene()

  await renderComponent(
    makeCadComponent({
      cad_component_id: "cad_sj_svg",
      source_component_id: "src_sj_svg",
      footprinter_string: "solderjumper2_bridged12_p1.0414_pw0.6604_ph1.27",
    }),
    scene,
  )
  await renderComponent(
    makeCadComponent({
      cad_component_id: "cad_fid_svg",
      source_component_id: "src_fid_svg",
      footprinter_string: "fiducial",
      position: { x: 2, y: 0, z: 0.7 },
    }),
    scene,
  )

  expect(scene.children).toHaveLength(0)

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    makeCadComponent({
      cad_component_id: "cad_sj_board",
      pcb_component_id: "pcb_sj_board",
      source_component_id: "src_sj_board",
      footprinter_string: "solderjumper2_bridged12",
      position: { x: 0, y: 0, z: 0.8 },
    }),
    makeCadComponent({
      cad_component_id: "cad_fid_board",
      pcb_component_id: "pcb_fid_board",
      source_component_id: "src_fid_board",
      footprinter_string: "fiducial",
      position: { x: 2, y: 2, z: 0.8 },
    }),
  ]

  const svg = await convertCircuitJsonTo3dSvg(circuitJson, {
    width: 400,
    height: 300,
  })
  expect(svg).toContain("<svg")
})
