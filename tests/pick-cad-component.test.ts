import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
import { pickCadComponent } from "../src/utils/pick-cad-component"

const circuitJson = [
  {
    type: "source_component",
    source_component_id: "case_source",
    name: "CASE",
  },
  {
    type: "cad_component",
    cad_component_id: "case_cad",
    source_component_id: "case_source",
  },
] as AnyCircuitElement[]
const position = { x: 200, y: 150 }
const setup = () => {
  const rootObject = new THREE.Group()
  const group = new THREE.Group()
  group.userData.cad_component_id = "case_cad"
  const nested = new THREE.Group()
  nested.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshBasicMaterial(),
    ),
  )
  group.add(nested)
  rootObject.add(group)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0, 10)
  const renderer = {
    domElement: {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        width: 200,
        height: 200,
        right: 300,
        bottom: 250,
      }),
    },
  } as THREE.WebGLRenderer
  return { rootObject, group, camera, renderer }
}

test("picks mechanical CAD without a PCB component using its source name", () => {
  expect(pickCadComponent(setup(), position, circuitJson)).toEqual({
    cad_component_id: "case_cad",
    componentName: "CASE",
  })
  expect(pickCadComponent(setup(), position, circuitJson.slice(1))).toEqual({
    cad_component_id: "case_cad",
    componentName: "case_cad",
  })
})

test("picks individual CAD IDs even when models share a source component", () => {
  const scene = setup()
  scene.group.userData.cad_component_id = "case_lid"
  const json = [
    ...circuitJson,
    {
      ...circuitJson[1],
      cad_component_id: "case_lid",
    },
  ] as AnyCircuitElement[]
  expect(pickCadComponent(scene, position, json)?.cad_component_id).toBe(
    "case_lid",
  )
})

test("uses transformed geometry and perspective or orthographic cameras", () => {
  const scene = setup()
  scene.group.position.x = 4
  expect(pickCadComponent(scene, position, circuitJson)).toBeUndefined()
  scene.camera.position.x = 4
  expect(pickCadComponent(scene, position, circuitJson)?.componentName).toBe(
    "CASE",
  )
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
  camera.position.set(4, 0, 10)
  expect(
    pickCadComponent({ ...scene, camera }, position, circuitJson)
      ?.componentName,
  ).toBe("CASE")
})

test("skips hidden ancestors, respects occlusion, and rejects empty/background picks", () => {
  const scene = setup()
  scene.group.visible = false
  expect(pickCadComponent(scene, position, circuitJson)).toBeUndefined()
  scene.group.visible = true
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 1),
    new THREE.MeshBasicMaterial(),
  )
  board.position.z = 3
  scene.rootObject.add(board)
  expect(pickCadComponent(scene, position, circuitJson)).toBeUndefined()
  board.visible = false
  expect(pickCadComponent(scene, position, circuitJson)?.componentName).toBe(
    "CASE",
  )
  expect(pickCadComponent(null, position, circuitJson)).toBeUndefined()
  expect(pickCadComponent(scene, { x: 0, y: 0 }, circuitJson)).toBeUndefined()
  expect(
    pickCadComponent(scene, { x: 101, y: 51 }, circuitJson),
  ).toBeUndefined()
  expect(pickCadComponent(scene, position, [])).toBeUndefined()
})
