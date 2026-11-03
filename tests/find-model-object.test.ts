import { expect, test } from "bun:test"
import * as THREE from "three"
import { findModelObject } from "../src/utils/clone-model-for-export"

test("only CAD components and cables count as downloadable models", () => {
  const root = new THREE.Object3D()
  const board = new THREE.Group()
  board.userData.pcb_board_id = "board1"
  const component = new THREE.Group()
  component.userData.cad_component_id = "u1_cad"
  const nested = new THREE.Group()
  nested.userData.cad_component_id = "u1_cad"
  component.add(nested)
  const cable = new THREE.Group()
  cable.userData = { cad_cable_id: "cable1", name: "W1" }
  root.add(board, component, cable)
  expect(findModelObject(root, "u1_cad")).toBe(component)
  expect(findModelObject(root, "cable1")).toBe(cable)
  expect(findModelObject(root, "board1")).toBeUndefined()
})
