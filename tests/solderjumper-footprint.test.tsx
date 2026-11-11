import { expect, test } from "bun:test"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { AnyCadComponent } from "../src/AnyCadComponent"
import { CameraControllerProvider } from "../src/contexts/CameraControllerContext"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"
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
import { renderComponent } from "../src/utils/render-component"

test("solderjumper and 2D-only footprints do not throw or render Error3d in 3D viewer", async () => {
  expect(
    isFootprintWithout3dModel(
      "solderjumper2_bridged12_p1.0414_pw0.6604_ph1.27",
    ),
  ).toBe(true)
  expect(isFootprintWithout3dModel("solderjumper2")).toBe(true)
  expect(isFootprintWithout3dModel("solderjumper3_bridged123")).toBe(true)
  expect(isFootprintWithout3dModel("fiducial")).toBe(true)
  expect(isFootprintWithout3dModel("pad")).toBe(true)
  expect(isFootprintWithout3dModel("0402")).toBe(false)

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
  const errors: Error[] = []

  const cadComponent: CadComponent = {
    type: "cad_component",
    cad_component_id: "cad_sj1",
    pcb_component_id: "pcb_sj1",
    source_component_id: "source_sj1",
    position: { x: 0, y: 0, z: 0.7 },
    rotation: { x: 0, y: 0, z: 0 },
    anchor_alignment: "center_of_component_on_board_surface",
    model_object_fit: "contain_within_bounds",
    footprinter_string: "solderjumper2_bridged12_p1.0414_pw0.6604_ph1.27",
  }

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "source_sj1",
      name: "SJ1",
      ftype: "simple_resistor",
      resistance: 0,
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_sj1",
      source_component_id: "source_sj1",
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 0,
      width: 2,
      height: 1.5,
      obstructs_within_bounds: true,
    },
    cadComponent,
  ]

  try {
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <LayerVisibilityProvider>
            <ThreeContext.Provider value={context}>
              <HoverContext.Provider
                value={{ addHoverable: () => {}, removeHoverable: () => {} }}
              >
                <ThreeErrorBoundary
                  fallback={({ error }) => {
                    errors.push(error)
                    return (
                      <Error3d cad_component={cadComponent} error={error} />
                    )
                  }}
                >
                  <AnyCadComponent
                    cad_component={cadComponent}
                    circuitJson={circuitJson}
                  />
                  <FootprinterModel
                    positionOffset={[0, 0, 0]}
                    footprint="solderjumper2_bridged12_p1.0414_pw0.6604_ph1.27"
                    onHover={() => {}}
                    onUnhover={() => {}}
                    isHovered={false}
                  />
                  <FootprinterModel
                    positionOffset={[0, 0, 0]}
                    footprint="fiducial"
                    onHover={() => {}}
                    onUnhover={() => {}}
                    isHovered={false}
                  />
                </ThreeErrorBoundary>
              </HoverContext.Provider>
            </ThreeContext.Provider>
          </LayerVisibilityProvider>
        </CameraControllerProvider>,
      )
    })

    expect(errors).toEqual([])
    expect(rootObject.children).toHaveLength(0)

    const svgScene = new THREE.Scene()
    await renderComponent(cadComponent, svgScene)
    expect(svgScene.children).toHaveLength(0)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, previous)
    dom.window.close()
  }
})
