import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import {
  cloneMaskedCopperMaterial,
  createMaskedCopperMaterial,
} from "../src/utils/create-masked-copper-material"
import { createGeometryMeshes } from "../src/utils/manifold/create-three-geometry-meshes"

for (const layer of ["top", "bottom"] as const) {
  test(`${layer}: tented via lining follows the overlapping SMT pad opening`, () => {
    const previousDocument = globalThis.document
    Object.assign(globalThis, {
      document: { createElement: () => createCanvas(1, 1) },
    })
    const board: PcbBoard = {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 10, y: 5 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    }
    const circuit: AnyCircuitElement[] = [
      board,
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: "pad",
        pcb_component_id: "component",
        shape: "rect",
        x: 9,
        y: 6,
        width: 2,
        height: 1,
        layer,
      },
      {
        type: "pcb_via",
        pcb_via_id: "via",
        x: 10,
        y: 6,
        hole_diameter: 1,
        outer_diameter: 1.4,
        layers: ["top", "bottom"],
        tented_on_top: true,
        tented_on_bottom: true,
      },
    ]
    try {
      const coating = createMaskedCopperMaterial({
        circuitJson: circuit,
        boardData: board,
        visibility: { topMask: true, bottomMask: true },
      })
      const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.6)
      geometry.rotateX(Math.PI / 2).translate(10, 6, 0)
      const meshes = createGeometryMeshes(
        { vias: [{ key: "via", geometry, color: new THREE.Color("gold") }] },
        coating.material,
      )
      const material = meshes[0]!.material as THREE.MeshStandardMaterial
      // Both renderer paths clone materials; the live mesh must keep the coating.
      expect(material.onBeforeCompile).toBe(coating.material.onBeforeCompile)
      expect(cloneMaskedCopperMaterial(coating.material).onBeforeCompile).toBe(
        material.onBeforeCompile,
      )
      const shader = {
        uniforms: {},
        vertexShader: THREE.ShaderLib.standard.vertexShader,
        fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      }
      material.onBeforeCompile(shader as any, {} as THREE.WebGLRenderer)
      const uniforms = shader.uniforms as Record<string, { value: any }>
      const texture = uniforms.copperMaskAtlas!.value as THREE.CanvasTexture
      const canvas = texture.image
      const pixel = (x: number, y: number) =>
        Array.from(
          canvas.getContext("2d").getImageData(x, y, 1, 1).data,
        ) as number[]
      // Pad edge is at board x=10: the left half of the lining is in the
      // aperture, and the right half lies under opaque green soldermask.
      const left = pixel(
        Math.floor(canvas.width * 0.45),
        Math.floor(canvas.height * (layer === "top" ? 0.2 : 0.7)),
      )
      const right = pixel(
        Math.floor(canvas.width * 0.55),
        Math.floor(canvas.height * (layer === "top" ? 0.2 : 0.7)),
      )
      expect(left[3]).toBe(0)
      expect(right[3]).toBe(255)
      expect(right[1]!).toBeGreaterThan(right[0]!)
      expect(material.userData.copperMaskBounds).toEqual([5, 0, 10, 10])
      geometry.dispose()
      material.dispose()
      coating.dispose()
    } finally {
      Object.assign(globalThis, { document: previousDocument })
    }
  })
}

test("hidden soldermask does not coat copper and each side follows its visibility", () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })
  try {
    const board: PcbBoard = {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 2,
      height: 2,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    }
    const coating = createMaskedCopperMaterial({
      circuitJson: [board],
      boardData: board,
      visibility: { topMask: false, bottomMask: true },
    })
    const shader = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    }
    coating.material.onBeforeCompile(shader as any, {} as THREE.WebGLRenderer)
    const texture = (shader.uniforms as any).copperMaskAtlas.value
    const ctx = texture.image.getContext("2d")
    expect(ctx.getImageData(10, 10, 1, 1).data[3]).toBe(0)
    expect(ctx.getImageData(10, texture.image.height - 10, 1, 1).data[3]).toBe(
      255,
    )
    coating.dispose()
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})

test("copper mask UVs remain on their own board layer when the board folds", async () => {
  const { applyCopperMaskUvs } = await import(
    "../src/utils/create-masked-copper-material"
  )
  const { createFlexMeshes } = await import("../src/utils/flex-meshes")
  const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.6, 32)
  geometry.rotateX(Math.PI / 2).translate(13, 5, 0)
  const material = new THREE.MeshStandardMaterial()
  material.userData.copperMaskBounds = [5, 0, 10, 10]
  applyCopperMaskUvs(geometry, material)
  const position = geometry.getAttribute("position")
  const uv = geometry.getAttribute("uv")
  expect(geometry.getAttribute("normal").count).toBe(position.count)
  for (let i = 0; i < position.count; i += 3) {
    const top = [0, 1, 2].every((j) => position.getZ(i + j) >= -1e-8)
    const bottom = [0, 1, 2].every((j) => position.getZ(i + j) <= 1e-8)
    expect(top || bottom).toBe(true)
    for (let j = 0; j < 3; j++) {
      // Each triangle samples a single atlas layer, never interpolating across
      // the unrelated top/bottom images down the wall of the hole.
      expect(uv.getY(i + j) > 0.5).toBe(top)
    }
  }
  const before = Array.from(uv.array)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = "via"
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 10, y: 5 },
    width: 10,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  }
  const folded = createFlexMeshes(
    [mesh],
    [],
    [
      board,
      {
        type: "pcb_bend",
        pcb_bend_id: "bend",
        pcb_board_id: "board",
        start: { x: 0, y: -5 },
        end: { x: 0, y: 5 },
        bend_radius: 1,
        bend_angle: 90,
        bend_side: "right",
      },
    ] as AnyCircuitElement[],
    true,
  )
  expect(
    Array.from(folded.geometryMeshes[0]!.geometry.getAttribute("uv").array),
  ).toEqual(before)
  expect(
    Array.from(
      folded.geometryMeshes[0]!.geometry.getAttribute("position").array,
    ),
  ).not.toEqual(Array.from(position.array))
  folded.geometryMeshes[0]!.geometry.dispose()
  geometry.dispose()
  material.dispose()
})
