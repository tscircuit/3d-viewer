import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import type { CadComponent } from "circuit-json"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import * as THREE from "three"
import { AnyCadComponent } from "../src/AnyCadComponent"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"
import { HoverContext } from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"

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
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined

beforeEach(() => {
  dom = new JSDOM('<div id="root"></div>')
  previousWindow = globalThis.window
  previousDocument = globalThis.document
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  window.TSCIRCUIT_OBJ_LOADER_CACHE = new Map()
  reactRoot = createRoot(document.getElementById("root")!)
  sceneRoot = new THREE.Object3D()
})

afterEach(async () => {
  await act(async () => reactRoot.unmount())
  fetchSpy?.mockRestore()
  fetchSpy = undefined
  Object.assign(globalThis, {
    window: previousWindow,
    document: previousDocument,
    IS_REACT_ACT_ENVIRONMENT: false,
  })
  dom.window.close()
})

const renderCadComponent = async (cadComponent: CadComponent) => {
  const context: ThreeContextState = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as THREE.WebGLRenderer,
    rootObject: sceneRoot,
    addFrameListener: () => {},
    removeFrameListener: () => {},
  }
  await act(async () => {
    reactRoot.render(
      <ThreeContext.Provider value={context}>
        <HoverContext.Provider
          value={{ addHoverable: () => {}, removeHoverable: () => {} }}
        >
          <LayerVisibilityProvider>
            <AnyCadComponent
              cad_component={cadComponent}
              circuitJson={[cadComponent]}
            />
          </LayerVisibilityProvider>
        </HoverContext.Provider>
      </ThreeContext.Provider>,
    )
  })
  sceneRoot.updateMatrixWorld(true)
}

test("loads the binary gimbal holder from an extensionless URL with its CAD transforms", async () => {
  const holderBytes = await Bun.file(
    new URL("../stories/assets/gimbal-phone-holder.stl", import.meta.url),
  ).arrayBuffer()
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(holderBytes),
  )

  await renderCadComponent({
    type: "cad_component",
    cad_component_id: "holder",
    source_component_id: "holder_source",
    model_stl_url: "/api/assets/holder?revision=1",
    position: { x: 15, y: -20, z: 30 },
    rotation: { x: 0, y: 0, z: 90 },
    model_unit_to_mm_scale_factor: 1.5,
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
  })

  const mesh = sceneRoot.getObjectByProperty("type", "Mesh") as THREE.Mesh
  expect(mesh.geometry.getAttribute("position").count).toBe(30420)
  const transformedPoint = mesh.localToWorld(new THREE.Vector3(1, 2, 3))
  expect(transformedPoint.x).toBeCloseTo(19.5)
  expect(transformedPoint.y).toBeCloseTo(-18.5)
  expect(transformedPoint.z).toBeCloseTo(27)
  expect(fetchSpy).toHaveBeenCalledWith("/api/assets/holder?revision=1")
})

test("loads ASCII STL from a data URL", async () => {
  await renderCadComponent({
    type: "cad_component",
    cad_component_id: "ascii_stl",
    source_component_id: "ascii_source",
    model_stl_url: `data:model/stl,${encodeURIComponent(asciiStl)}`,
    position: { x: 0, y: 0, z: 0 },
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
  })

  const mesh = sceneRoot.getObjectByProperty("type", "Mesh") as THREE.Mesh
  expect(mesh.geometry.getAttribute("position").count).toBe(3)
  expect(mesh.geometry.getAttribute("position").getX(1)).toBe(1)
})

test("loads the binary gimbal holder from a base64 data URL", async () => {
  const holderBytes = await Bun.file(
    new URL("../stories/assets/gimbal-phone-holder.stl", import.meta.url),
  ).arrayBuffer()

  await renderCadComponent({
    type: "cad_component",
    cad_component_id: "binary_stl",
    source_component_id: "binary_source",
    model_stl_url: `data:model/stl;base64,${Buffer.from(holderBytes).toString("base64")}`,
    position: { x: 0, y: 0, z: 0 },
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
  })

  const mesh = sceneRoot.getObjectByProperty("type", "Mesh") as THREE.Mesh
  expect(mesh.geometry.getAttribute("position").count).toBe(30420)
})

test("clears the previous OBJ while loading STL at the same URL", async () => {
  const request = Promise.withResolvers<Response>()
  fetchSpy = spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("v 0 0 0\nv 4 0 0\nv 0 5 0\nf 1 2 3\n"))
    .mockReturnValueOnce(request.promise)
  const cadComponent: CadComponent = {
    type: "cad_component",
    cad_component_id: "shared_url",
    source_component_id: "shared_source",
    position: { x: 0, y: 0, z: 0 },
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
  }
  await renderCadComponent({
    ...cadComponent,
    model_obj_url: "/api/model",
  })
  const objMesh = sceneRoot.getObjectByProperty("type", "Mesh") as THREE.Mesh
  expect(objMesh.geometry.getAttribute("position").count).toBe(3)
  expect(objMesh.geometry.getAttribute("position").getX(1)).toBe(4)

  await renderCadComponent({
    ...cadComponent,
    model_stl_url: "/api/model",
  })
  expect(sceneRoot.getObjectById(objMesh.id)).toBeUndefined()

  await act(async () => request.resolve(new Response(asciiStl)))

  const stlMesh = sceneRoot.getObjectByProperty("type", "Mesh") as THREE.Mesh
  expect(stlMesh.geometry.getAttribute("position").count).toBe(3)
  expect(stlMesh.geometry.getAttribute("position").getX(1)).toBe(1)
  expect(fetchSpy).toHaveBeenCalledTimes(2)
})

test("reuses a completed STL request with a distinct model instance", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(asciiStl),
  )
  const cadComponent: CadComponent = {
    type: "cad_component",
    cad_component_id: "first_holder",
    source_component_id: "holder_source",
    model_stl_url: "/api/holder",
    position: { x: 0, y: 0, z: 0 },
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
  }
  await renderCadComponent(cadComponent)
  const firstMesh = sceneRoot.getObjectByProperty("type", "Mesh") as THREE.Mesh

  await renderCadComponent({
    ...cadComponent,
    cad_component_id: "second_holder",
  })

  const secondMesh = sceneRoot.getObjectByProperty("type", "Mesh") as THREE.Mesh
  expect(secondMesh.geometry.getAttribute("position").count).toBe(3)
  expect(secondMesh).not.toBe(firstMesh)
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})

test("shares a pending STL request between models with separate transforms", async () => {
  const request = Promise.withResolvers<Response>()
  fetchSpy = spyOn(globalThis, "fetch").mockReturnValue(request.promise)
  const firstHolder: CadComponent = {
    type: "cad_component",
    cad_component_id: "first_holder",
    source_component_id: "holder_source",
    model_stl_url: "/api/holder",
    position: { x: 10, y: 0, z: 0 },
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
  }
  const secondHolder: CadComponent = {
    ...firstHolder,
    cad_component_id: "second_holder",
    position: { x: 20, y: 0, z: 0 },
  }
  const context: ThreeContextState = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as THREE.WebGLRenderer,
    rootObject: sceneRoot,
    addFrameListener: () => {},
    removeFrameListener: () => {},
  }
  await act(async () => {
    reactRoot.render(
      <ThreeContext.Provider value={context}>
        <HoverContext.Provider
          value={{ addHoverable: () => {}, removeHoverable: () => {} }}
        >
          <LayerVisibilityProvider>
            <AnyCadComponent
              cad_component={firstHolder}
              circuitJson={[firstHolder]}
            />
            <AnyCadComponent
              cad_component={secondHolder}
              circuitJson={[secondHolder]}
            />
          </LayerVisibilityProvider>
        </HoverContext.Provider>
      </ThreeContext.Provider>,
    )
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)

  await act(async () => request.resolve(new Response(asciiStl)))
  sceneRoot.updateMatrixWorld(true)

  const firstMesh = sceneRoot.children[0]!.getObjectByProperty(
    "type",
    "Mesh",
  ) as THREE.Mesh
  const secondMesh = sceneRoot.children[1]!.getObjectByProperty(
    "type",
    "Mesh",
  ) as THREE.Mesh
  expect(firstMesh.geometry.getAttribute("position").count).toBe(3)
  expect(secondMesh.geometry.getAttribute("position").count).toBe(3)
  expect(secondMesh).not.toBe(firstMesh)
  expect(firstMesh.getWorldPosition(new THREE.Vector3()).x).toBeCloseTo(10)
  expect(secondMesh.getWorldPosition(new THREE.Vector3()).x).toBeCloseTo(20)
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})

test("preserves VRML loading with the declared model format", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(`#VRML V2.0 utf8
Shape { geometry Box { size 2 4 6 } }`),
  )

  await renderCadComponent({
    type: "cad_component",
    cad_component_id: "vrml",
    source_component_id: "vrml_source",
    model_wrl_url: "https://models.example/asset?revision=1",
    position: { x: 0, y: 0, z: 0 },
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
  })

  const mesh = sceneRoot.getObjectByProperty("type", "Mesh") as THREE.Mesh
  mesh.geometry.computeBoundingBox()
  expect(
    mesh.geometry.boundingBox!.getSize(new THREE.Vector3()).toArray(),
  ).toEqual([2, 4, 6])
})
