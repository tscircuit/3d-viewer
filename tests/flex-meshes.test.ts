import { resolveFoldPcbs } from "../src/utils/resolve-fold-pcbs"
import { expect, test } from "bun:test"
import * as THREE from "three"
import { createFlexMeshes } from "../src/utils/flex-meshes"
import { getCadModelTransform } from "../src/utils/cad-model-transform"
import type { AnyCircuitElement } from "circuit-json"

const json = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 10, y: 3 },
    thickness: 0.15,
    width: 12,
    height: 2,
  },
  {
    type: "pcb_bend",
    pcb_bend_id: "bend",
    pcb_board_id: "board",
    start: { x: 0, y: -1 },
    end: { x: 0, y: 1 },
    bend_radius: 2,
    bend_angle: 90,
    bend_side: "right",
  },
] as AnyCircuitElement[]
test("native meshes fold with clipped texture UVs and preserve the flat geometry", () => {
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(12, 2, 0.15),
    new THREE.MeshStandardMaterial(),
  )
  board.name = "board-geom"
  board.position.set(10, 3, 0)
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 8),
    new THREE.MeshPhysicalMaterial(),
  )
  plane.name = "top-board-texture-plane"
  plane.position.set(10, 3, 0.08)
  const flat = board.geometry.getAttribute("position").array.slice()
  const output = createFlexMeshes([board], [plane], json, true)
  expect(board.geometry.getAttribute("position").array).toEqual(flat)
  expect(output.bounds?.maxZ).toBeCloseTo(2 + 6 - Math.PI / 2, 5)
  const texture = output.textureMeshes[0]!
  expect(texture.position.toArray()).toEqual([0, 0, 0])
  const uv = texture.geometry.getAttribute("uv")
  for (let i = 0; i < uv.count; i++) {
    expect(uv.getY(i)).toBeGreaterThanOrEqual(0.375)
    expect(uv.getY(i)).toBeLessThanOrEqual(0.625)
  }
  expect(texture.geometry.getAttribute("position").count).toBeGreaterThan(6)
  expect(texture.material).toBe(plane.material)
  expect(createFlexMeshes([board], [], json, false).geometryMeshes[0]).toBe(
    board,
  )
})
test("assembled bottom CAD height is used verbatim, without the flat bottom-layer correction", () => {
  const cad = {
    type: "cad_component" as const,
    cad_component_id: "cad",
    source_component_id: "src",
    pcb_component_id: "pcb",
    position: { x: 2, y: 4, z: 8 },
    rotation: { x: 25, y: 70, z: 40 },
    is_on_folded_board: true,
    anchor_alignment: "center" as const,
    model_object_fit: "contain_within_bounds" as const,
  }
  const transform = getCadModelTransform(cad, {
    layer: "bottom",
    pcbThickness: 0.15,
    modelType: "gltf",
  })
  expect(transform.position).toEqual([2, 4, 8])
  expect(transform.rotation).toEqual(
    [25, 70, 40].map((a) => (a * Math.PI) / 180) as [number, number, number],
  )
})

test("default board geometry follows Circuit JSON while explicit folding overrides it", () => {
  for (const storedFoldState of [undefined, false, true]) {
    const circuitJson: AnyCircuitElement[] = [
      ...json,
      {
        type: "cad_component",
        cad_component_id: "cad",
        source_component_id: "source",
        pcb_component_id: "pcb",
        position: { x: 16, y: 3, z: 0.075 },
        rotation: { x: 0, y: 0, z: 0 },
        anchor_alignment: "center",
        model_object_fit: "contain_within_bounds",
        is_on_folded_board: storedFoldState,
      },
    ]
    for (const override of [undefined, false, true]) {
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(12, 2, 0.15),
        new THREE.MeshStandardMaterial(),
      )
      board.position.set(10, 3, 0)
      const output = createFlexMeshes(
        [board],
        [],
        circuitJson,
        resolveFoldPcbs(circuitJson, override),
      )
      if (
        override === true ||
        (override === undefined && storedFoldState === true)
      ) {
        expect(output.bounds?.maxZ).toBeCloseTo(2 + 6 - Math.PI / 2, 5)
      } else {
        expect(output.geometryMeshes[0]).toBe(board)
      }
    }
  }
})
