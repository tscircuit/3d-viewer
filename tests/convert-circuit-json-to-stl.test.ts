import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  combineModelsToStl,
  convertCircuitJsonToStl,
} from "../src/convert-circuit-json-to-stl"

test("combineModelsToStl combines multiple Three.js meshes into a single STL output", () => {
  const meshA = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2))
  meshA.position.set(-5, 0, 0)

  const meshB = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2))
  meshB.position.set(5, 0, 0)

  const asciiStl = combineModelsToStl([meshA, meshB])
  expect(typeof asciiStl).toBe("string")
  expect(asciiStl).toContain("solid exported")
  expect(asciiStl).toContain("endsolid exported")

  const facetCount = (asciiStl.match(/facet normal/g) ?? []).length
  // Each box has 12 triangles, so 2 boxes have 24 triangles
  expect(facetCount).toBe(24)

  const binaryStl = combineModelsToStl([meshA, meshB], { binary: true })
  expect(binaryStl).toBeInstanceOf(ArrayBuffer)
  const view = new DataView(binaryStl)
  const triangleCount = view.getUint32(80, true)
  expect(triangleCount).toBe(24)
  expect(binaryStl.byteLength).toBe(84 + 24 * 50)
})

test("convertCircuitJsonToStl combines board and CAD component models into a single STL", async () => {
  const circuitJson: any[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_1",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      position: { x: 0, y: 0, z: 0.8 },
      rotation: { x: 0, y: 0, z: 0 },
      footprinter_string: "0402",
    },
  ]

  const boardOnlyStl = await convertCircuitJsonToStl(circuitJson, {
    includeComponents: false,
  })
  const combinedStl = await convertCircuitJsonToStl(circuitJson)

  const boardTriangles = (boardOnlyStl.match(/facet normal/g) ?? []).length
  const combinedTriangles = (combinedStl.match(/facet normal/g) ?? []).length

  expect(boardTriangles).toBeGreaterThan(0)
  expect(combinedTriangles).toBeGreaterThan(boardTriangles)

  const binaryCombined = await convertCircuitJsonToStl(circuitJson, {
    binary: true,
  })
  const view = new DataView(binaryCombined)
  expect(view.getUint32(80, true)).toBe(combinedTriangles)
})
