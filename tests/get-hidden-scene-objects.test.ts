import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
import { getHiddenSceneObjects } from "../src/utils/get-hidden-scene-objects"

const circuitJson = [
  { type: "source_component", source_component_id: "s1", name: "U1" },
  {
    type: "cad_component",
    cad_component_id: "cad1",
    source_component_id: "s1",
  },
  {
    type: "cad_component",
    cad_component_id: "cad2",
    source_component_id: "s1",
  },
  {
    type: "cad_component",
    cad_component_id: "cad3",
    source_component_id: "unknown",
  },
] as AnyCircuitElement[]

test("lists unmounted models by CAD identity, retaining duplicate names and ID fallbacks", () => {
  expect(
    getHiddenSceneObjects(circuitJson, {
      hiddenIds: new Set(["cad1", "cad2", "cad3"]),
    }),
  ).toEqual([
    { objectId: "cad1", name: "U1" },
    { objectId: "cad2", name: "U1" },
    { objectId: "cad3", name: "cad3" },
  ])
  expect(
    getHiddenSceneObjects(circuitJson, { hiddenIds: new Set(["cad2"]) }),
  ).toEqual([{ objectId: "cad2", name: "U1" }])
  expect(getHiddenSceneObjects(circuitJson, { hiddenIds: new Set() })).toEqual(
    [],
  )
})

test("finds invisible GLB models and boards without Circuit JSON and deduplicates tagged meshes", () => {
  const root = new THREE.Group()
  for (const id of ["glb1", "glb1", "glb2"]) {
    const group = new THREE.Group()
    group.userData = {
      cad_component_id: id,
      tscircuit: { cad_component_id: id, componentName: "ENCLOSURE" },
    }
    group.visible = false
    root.add(group)
  }
  const board = new THREE.Group()
  board.userData.pcb_board_id = "board"
  root.add(board)
  expect(
    getHiddenSceneObjects([], { hiddenIds: new Set(["glb1", "board"]) }, root),
  ).toEqual([
    { objectId: "glb1", name: "ENCLOSURE" },
    { objectId: "board", name: "Board" },
  ])
})

test("selective restores preserve isolation and keep every other object hidden", () => {
  expect(
    getHiddenSceneObjects(circuitJson, {
      hiddenIds: new Set(),
      isolatedId: "cad1",
      unhiddenIds: new Set(["cad2"]),
    }),
  ).toEqual([{ objectId: "cad3", name: "cad3" }])
  // A later explicit hide still takes precedence over an isolation exception.
  expect(
    getHiddenSceneObjects(circuitJson, {
      hiddenIds: new Set(["cad2"]),
      isolatedId: "cad1",
      unhiddenIds: new Set(["cad2", "cad3"]),
    }),
  ).toEqual([{ objectId: "cad2", name: "U1" }])
})
