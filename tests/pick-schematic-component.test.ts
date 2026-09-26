import { expect, test } from "bun:test"
import * as THREE from "three"
import type { AnyCircuitElement } from "circuit-json"
import { pickSchematicComponent } from "../src/utils/pick-schematic-component"

const circuitJson = [
  { type: "source_component", source_component_id: "source_r1", name: "R1" },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_r1",
    source_component_id: "source_r1",
  },
] as AnyCircuitElement[]

const setup = () => {
  const rootObject = new THREE.Group()
  const group = new THREE.Group()
  group.userData.pcb_component_id = "pcb_r1"
  group.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshBasicMaterial(),
    ),
  )
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
  return { rootObject, camera, renderer, group }
}
const position = { x: 200, y: 150 }

test("picks nested model meshes using the PCB viewer identity contract", () => {
  expect(pickSchematicComponent(setup(), position, circuitJson)).toEqual({
    source_component_id: "source_r1",
    pcb_component_id: "pcb_r1",
    refdes: "R1",
  })
})
test("uses actual transformed model geometry and the current camera", () => {
  const scene = setup()
  scene.group.position.x = 4
  expect(pickSchematicComponent(scene, position, circuitJson)).toBeUndefined()
  scene.camera.position.x = 4
  expect(pickSchematicComponent(scene, position, circuitJson)?.refdes).toBe(
    "R1",
  )
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
  camera.position.set(4, 0, 10)
  expect(
    pickSchematicComponent({ ...scene, camera }, position, circuitJson)?.refdes,
  ).toBe("R1")
})
test("ignores hidden components and does not pick through the board", () => {
  const scene = setup()
  scene.group.visible = false
  expect(pickSchematicComponent(scene, position, circuitJson)).toBeUndefined()
  scene.group.visible = true
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 1),
    new THREE.MeshBasicMaterial(),
  )
  board.position.z = 3
  scene.rootObject.add(board)
  expect(pickSchematicComponent(scene, position, circuitJson)).toBeUndefined()
  board.visible = false
  expect(pickSchematicComponent(scene, position, circuitJson)?.refdes).toBe(
    "R1",
  )
})
test("background, unowned mechanical models, and incomplete identities have no action", () => {
  const scene = setup()
  expect(
    pickSchematicComponent(scene, { x: 0, y: 0 }, circuitJson),
  ).toBeUndefined()
  expect(
    pickSchematicComponent(scene, { x: 101, y: 51 }, circuitJson),
  ).toBeUndefined()
  expect(pickSchematicComponent(scene, position, [])).toBeUndefined()
  delete scene.group.userData.pcb_component_id
  expect(pickSchematicComponent(scene, position, circuitJson)).toBeUndefined()
  expect(pickSchematicComponent(null, position, circuitJson)).toBeUndefined()
})
