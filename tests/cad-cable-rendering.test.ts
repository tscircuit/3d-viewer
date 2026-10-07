import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  createCadCableObject,
  getCadCables,
  type CadCableElement,
} from "../src/three-components/CadCable"

const cable: CadCableElement = {
  type: "cad_cable",
  cad_cable_id: "cad_cable_test",
  name: "MOTOR_CABLE",
  cableprinter_string: "jst_ph_pins4",
  from_connector_pin1_position: { x: -10, y: -1, z: 4 },
  to_connector_pin1_position: { x: 10, y: -1, z: 4 },
  path: [
    { x: -10, y: 0, z: 4 },
    { x: -8, y: 0, z: 8 },
    { x: 0, y: 0, z: 12 },
    { x: 8, y: 0, z: 8 },
    { x: 10, y: 0, z: 4 },
  ],
}

test("finds cad_cable elements without requiring circuit-json type support", () => {
  expect(getCadCables([{ type: "pcb_board" }, cable])).toEqual([cable])
})

test("creates colored conductor and connector meshes for a CAD cable", () => {
  const object = createCadCableObject(cable)
  const meshes = object.children.filter(
    (child): child is THREE.Mesh => child instanceof THREE.Mesh,
  )

  expect(object.name).toBe("cad-cable-cad_cable_test")
  expect(meshes.length).toBeGreaterThanOrEqual(6)
  expect(meshes.some((mesh) => mesh.name.endsWith(":wire-1"))).toBe(true)
  expect(meshes.some((mesh) => mesh.name.endsWith(":A-housing"))).toBe(true)
  expect(
    meshes.every(
      (mesh) =>
        mesh.geometry.getAttribute("position").count > 0 &&
        mesh.geometry.getAttribute("normal").count > 0,
    ),
  ).toBe(true)
})
