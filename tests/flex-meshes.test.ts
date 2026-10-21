import { resolveFoldPcbs } from "../src/utils/resolve-fold-pcbs"
import { expect, test } from "bun:test"
import * as THREE from "three"
import { createFlexMeshes, meshToSurface } from "../src/utils/flex-meshes"
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

function createTwoTailBoard({ fractionalTailEdge = false } = {}) {
  // The upper encoder tail returns under the body; the lower JST tail bends down.
  // Their finite axes are deliberately nonparallel and their infinite half-planes
  // overlap, so each bend must use the outline to select only its own tail.
  const center = { x: 11, y: -13 }
  const outline = [
    [-10, -10],
    [10, -10],
    [10, -7],
    [fractionalTailEdge ? 30.1234567 : 30, -7],
    [fractionalTailEdge ? 30.1234567 : 30, -3],
    [10, -3],
    [10, 3],
    [40, 3],
    [40, 7],
    [10, 7],
    [10, 10],
    [-10, 10],
  ].map(([x, y]) => ({ x: x!, y: y! }))
  const board = new THREE.Mesh(
    new THREE.ExtrudeGeometry(
      new THREE.Shape(outline.map(({ x, y }) => new THREE.Vector2(x, y))),
      { depth: 0.2, bevelEnabled: false },
    ).translate(0, 0, -0.1),
    new THREE.MeshStandardMaterial(),
  )
  board.name = "board-geom"
  board.position.set(center.x, center.y, 0)
  const marker = (name: string, x: number, y: number) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [x, y, 0.1, x + 0.1, y, 0.1, x, y + 0.1, 0.1],
        3,
      ),
    )
    geometry.computeVertexNormals()
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())
    mesh.name = name
    mesh.position.set(center.x, center.y, 0)
    return mesh
  }
  const geometry = [
    board,
    marker("encoder-copper", 35, 5),
    marker("jst-copper", 27, -5),
    marker("body-copper", 0, 0),
  ]
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 20),
    new THREE.MeshPhysicalMaterial(),
  )
  plane.name = "top-board-texture-plane"
  plane.position.set(center.x + 15, center.y, 0.105)
  const bends = [
    {
      type: "pcb_bend",
      pcb_bend_id: "encoder",
      pcb_board_id: "board",
      start: { x: 17, y: 3 },
      end: { x: 16, y: 7 },
      bend_radius: 2,
      bend_angle: -180,
      bend_side: "right",
    },
    {
      type: "pcb_bend",
      pcb_bend_id: "jst",
      pcb_board_id: "board",
      start: { x: 16, y: -7 },
      end: { x: 16, y: -3 },
      bend_radius: 2,
      bend_angle: -90,
      bend_side: "right",
    },
  ] as AnyCircuitElement[]
  const stiffener = (name: string, x: number, y: number) => ({
    type: "pcb_stiffener",
    pcb_stiffener_id: name,
    pcb_board_id: "board",
    layer: "bottom",
    material: "fr4",
    thickness: 0.8,
    adhesive_thickness: 0.05,
    shape: "polygon",
    outline: [
      { x: x - 1, y: y - 1 },
      { x: x + 1, y: y - 1 },
      { x: x + 1, y: y + 1 },
      { x: x - 1, y: y + 1 },
    ],
  })
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center,
      width: 50,
      height: 20,
      thickness: 0.2,
      // Circuit JSON board outlines are global, whereas bend axes are local.
      outline: outline.map(({ x, y }) => ({
        x: x + center.x,
        y: y + center.y,
      })),
    },
    ...bends,
    stiffener("encoder-stiffener", 35, 5),
    stiffener("jst-stiffener", 27, -5),
    stiffener("body-stiffener", 0, 0),
  ] as AnyCircuitElement[]
  return { center, geometry, plane, circuitJson }
}

function firstVertex(mesh: THREE.Mesh) {
  return new THREE.Vector3().fromBufferAttribute(
    mesh.geometry.getAttribute("position"),
    0,
  )
}

test("nonparallel finite bends fold separate tails on a translated board", () => {
  for (const reverseBends of [false, true]) {
    const { center, geometry, plane, circuitJson } = createTwoTailBoard()
    const flatPositions = geometry.map((mesh) =>
      mesh.geometry.getAttribute("position").array.slice(),
    )
    const orderedJson = reverseBends ? [...circuitJson].reverse() : circuitJson
    const output = createFlexMeshes(geometry, [plane], orderedJson, true)
    const encoder = firstVertex(output.geometryMeshes[1]!)
    // A half turn reflects XY across 4x+y=71 and puts the top copper at Z=-4.1.
    expect(encoder.x).toBeCloseTo(center.x + 35 - 592 / 17, 5)
    expect(encoder.y).toBeCloseTo(center.y + 5 - 148 / 17, 5)
    expect(encoder.z).toBeCloseTo(-4.1, 5)
    const jst = firstVertex(output.geometryMeshes[2]!)
    // A radius-2 quarter turn has tangencies at 16 +/- pi/2.
    expect(jst.x).toBeCloseTo(center.x + 18 - Math.PI / 2 + 0.1, 5)
    expect(jst.y).toBeCloseTo(center.y - 5, 5)
    expect(jst.z).toBeCloseTo(-13 + Math.PI / 2, 5)
    const fixed = firstVertex(output.geometryMeshes[3]!)
    expect(fixed.x).toBeCloseTo(center.x, 5)
    expect(fixed.y).toBeCloseTo(center.y, 5)
    expect(fixed.z).toBeCloseTo(0.1, 5)

    for (const mesh of [...output.geometryMeshes, ...output.textureMeshes]) {
      for (const name of ["position", "normal", "uv"]) {
        const attribute = mesh.geometry.getAttribute(name)
        if (attribute)
          expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true)
      }
    }
    expect(Object.values(output.bounds!).every(Number.isFinite)).toBe(true)
    expect(output.textureMeshes[0]!.material).toBe(plane.material)
    geometry.forEach((mesh, i) => {
      expect(mesh.geometry.getAttribute("position").array).toEqual(
        flatPositions[i]!,
      )
      expect(output.geometryMeshes[i]!.material).toBe(mesh.material)
    })

    const stiffeners = output.geometryMeshes.filter(
      (mesh) => mesh.name === "board-stiffener",
    )
    expect(stiffeners).toHaveLength(3)
    const stiffenerCenters = stiffeners.map((mesh) =>
      new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()),
    )
    // The adhesive-backed stiffeners stay rigid on their respective islands.
    const upper = stiffenerCenters.find((p) => Math.abs(p.z + 3.45) < 1e-5)!
    expect(upper.x).toBeCloseTo(encoder.x, 5)
    expect(upper.y).toBeCloseTo(encoder.y, 5)
    const lower = stiffenerCenters.find(
      (p) => Math.abs(p.y - (center.y - 5)) < 1e-5,
    )!
    expect(lower.x).toBeCloseTo(center.x + 18 - Math.PI / 2 - 0.55, 5)
    expect(lower.z).toBeCloseTo(jst.z, 5)
    const body = stiffenerCenters.find((p) => Math.abs(p.z + 0.55) < 1e-5)!
    expect(body.x).toBeCloseTo(center.x, 5)
    expect(body.y).toBeCloseTo(center.y, 5)
  }
})

test("unfolded nonparallel tails retain the original meshes and flat stiffeners", () => {
  const { center, geometry, plane, circuitJson } = createTwoTailBoard()
  const output = createFlexMeshes(geometry, [plane], circuitJson, false)
  expect(output.geometryMeshes.slice(0, geometry.length)).toEqual(geometry)
  expect(output.textureMeshes).toEqual([plane])
  const stiffeners = output.geometryMeshes.filter(
    (mesh) => mesh.name === "board-stiffener",
  )
  expect(stiffeners).toHaveLength(3)
  const centers = stiffeners.map((mesh) =>
    new THREE.Box3()
      .setFromObject(mesh)
      .getCenter(new THREE.Vector3())
      .toArray(),
  )
  for (const [i, [x, y]] of [
    [35, 5],
    [27, -5],
    [0, 0],
  ].entries()) {
    expect(centers[i]![0]).toBeCloseTo(center.x + x!, 5)
    expect(centers[i]![1]).toBeCloseTo(center.y + y!, 5)
    expect(centers[i]![2]).toBeCloseTo(-0.55, 5)
  }
})

test("Float32 outline boundary vertices stay on their folded tail", () => {
  const { center, geometry, plane, circuitJson } = createTwoTailBoard({
    fractionalTailEdge: true,
  })
  // THREE stores this outer edge slightly outside the double-precision outline.
  // Passing those vertices to the fold unchanged leaves them flat and creates
  // long triangles joining the folded tail to the original distal edge.
  expect(Math.fround(30.1234567)).toBeGreaterThan(30.1234567 + 1e-7)
  const output = createFlexMeshes(geometry, [plane], circuitJson, true)
  for (const [mesh, topZ] of [
    [output.geometryMeshes[0]!, 0.1],
    [output.textureMeshes[0]!, 0.105],
  ] as const) {
    const positions = mesh.geometry.getAttribute("position")
    const lowerTail = Array.from({ length: positions.count }, (_, i) => ({
      x: positions.getX(i),
      y: positions.getY(i),
      z: positions.getZ(i),
    })).filter((p) => p.y < center.y - 3 - 1e-5)
    expect(lowerTail.length).toBeGreaterThan(0)
    // The distal edge lies below the board after the quarter turn, including
    // every side wall and the texture clipped to the same native outline.
    expect(Math.min(...lowerTail.map((p) => p.z))).toBeCloseTo(
      14 - 30.1234567 + Math.PI / 2,
      5,
    )
    expect(Math.max(...lowerTail.map((p) => p.x))).toBeCloseTo(
      center.x + 18 - Math.PI / 2 + topZ,
      5,
    )
    expect(lowerTail.every((p) => p.x < center.x + 18)).toBe(true)
  }
})

test("outline precision restoration respects mesh transforms and interior vertices", () => {
  const edge = 30.1234567
  const center = { x: 11, y: -13 }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [edge, -7, 0.1, 29, -6.9, 0.1, edge - 0.01, -6.8, 0.1],
      3,
    ),
  )
  const mesh = new THREE.Mesh(geometry)
  mesh.position.set(center.x, center.y, 2)
  mesh.rotation.z = Math.PI / 2
  mesh.scale.set(2, 3, 1)
  mesh.updateMatrix()
  const outline = [
    [10, -7],
    [edge, -7],
    [edge, -3],
    [10, -3],
  ].map(([x, y]) => {
    const p = new THREE.Vector3(x!, y!, 0).applyMatrix4(mesh.matrix)
    return { x: p.x, y: p.y }
  })
  const original = geometry.getAttribute("position").array.slice()
  const raw = meshToSurface(mesh, center)
  const restored = meshToSurface(mesh, center, outline)
  const boundary = restored.triangles[0]!.vertices[0]
  expect(boundary.x).toBeCloseTo(21, 10)
  expect(boundary.y).toBeCloseTo(edge * 2, 10)
  expect(boundary.z).toBe(raw.triangles[0]!.vertices[0].z)
  expect(restored.triangles[0]!.vertices.slice(1)).toEqual(
    raw.triangles[0]!.vertices.slice(1),
  )
  expect(restored.triangles[0]!.vertices[2].y).toBeLessThan(edge * 2 - 0.019)
  expect(geometry.getAttribute("position").array).toEqual(original)
})
