import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
import { pickSceneObject } from "../src/utils/pick-scene-object"

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
  expect(pickSceneObject(setup(), position, circuitJson)).toEqual({
    objectId: "case_cad",
    name: "CASE",
  })
  expect(pickSceneObject(setup(), position, circuitJson.slice(1))).toEqual({
    objectId: "case_cad",
    name: "case_cad",
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
  expect(pickSceneObject(scene, position, json)?.objectId).toBe("case_lid")
})

test("uses transformed geometry and perspective or orthographic cameras", () => {
  const scene = setup()
  scene.group.position.x = 4
  expect(pickSceneObject(scene, position, circuitJson)).toBeUndefined()
  scene.camera.position.x = 4
  expect(pickSceneObject(scene, position, circuitJson)?.name).toBe("CASE")
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
  camera.position.set(4, 0, 10)
  expect(
    pickSceneObject({ ...scene, camera }, position, circuitJson)?.name,
  ).toBe("CASE")
})

test("skips hidden ancestors, respects occlusion, and rejects empty/background picks", () => {
  const scene = setup()
  scene.group.visible = false
  expect(pickSceneObject(scene, position, circuitJson)).toBeUndefined()
  scene.group.visible = true
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 1),
    new THREE.MeshBasicMaterial(),
  )
  board.position.z = 3
  scene.rootObject.add(board)
  expect(pickSceneObject(scene, position, circuitJson)).toBeUndefined()
  board.visible = false
  expect(pickSceneObject(scene, position, circuitJson)?.name).toBe("CASE")
  expect(pickSceneObject(null, position, circuitJson)).toBeUndefined()
  expect(pickSceneObject(scene, { x: 0, y: 0 }, circuitJson)).toBeUndefined()
  expect(pickSceneObject(scene, { x: 101, y: 51 }, circuitJson)).toBeUndefined()
  expect(pickSceneObject(scene, position, [])).toBeUndefined()
})

test("picks the board group as one object, and cables by name", () => {
  const scene = setup()
  scene.group.userData = { pcb_board_id: "board1" }
  expect(pickSceneObject(scene, position, [])).toEqual({
    objectId: "board1",
    name: "Board",
  })
  scene.group.userData.pcb_board_id = "panel1"
  expect(
    pickSceneObject(scene, position, [
      { type: "pcb_panel", pcb_panel_id: "panel1" } as AnyCircuitElement,
    ])?.name,
  ).toBe("Panel")
  scene.group.userData = { cad_cable_id: "cable1", name: "J1-J2" }
  expect(pickSceneObject(scene, position, [])).toEqual({
    objectId: "cable1",
    name: "J1-J2",
  })
})
