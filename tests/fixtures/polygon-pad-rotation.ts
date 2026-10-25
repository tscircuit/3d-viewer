import { expect } from "bun:test"
import { geom3 } from "@jscad/modeling/src/geometries"
import { createCanvas } from "@napi-rs/canvas"
import type {
  AnyCircuitElement,
  PcbHoleWithPolygonPad,
  PcbPlatedHoleOval,
} from "circuit-json"
import ManifoldModule from "manifold-3d"
import * as THREE from "three"
import { BoardGeomBuilder } from "../../src/BoardGeomBuilder"
import { createCombinedBoardTextures } from "../../src/textures/create-combined-board-textures"
import { createGeometryFromPolygons } from "../../src/utils/create-geometry-from-polygons"
import { manifoldMeshToThreeGeometry } from "../../src/utils/manifold-mesh-to-three-geometry"
import { createManifoldBoard } from "../../src/utils/manifold/create-manifold-board"
import { processPlatedHolesForManifold } from "../../src/utils/manifold/process-plated-holes"
import { calculateOutlineBounds } from "../../src/utils/outline-bounds"
import {
  Unrotated,
  Rotated90Degrees,
  Rotated37Degrees,
} from "../../stories/JaeUsbPolygonPads.stories"

const stories: { rotation: number; circuit: AnyCircuitElement[] }[] = [
  { rotation: 0, circuit: Unrotated().props.circuitJson },
  { rotation: 90, circuit: Rotated90Degrees().props.circuitJson },
  { rotation: 37, circuit: Rotated37Degrees().props.circuitJson },
]
const originalHoles = stories[0]!.circuit.filter(
  (element): element is PcbPlatedHoleOval | PcbHoleWithPolygonPad =>
    element.type === "pcb_plated_hole" &&
    (element.shape === "pill" ||
      element.shape === "oval" ||
      element.shape === "hole_with_polygon_pad"),
)
const polygonPads = originalHoles.filter(
  (hole): hole is PcbHoleWithPolygonPad =>
    hole.shape === "hole_with_polygon_pad",
)
const drillProbes = [
  [0, 0],
  [0.2, 0],
  [-0.2, 0],
  [0, 0.2],
  [0, -0.2],
] as const

function rotatePoint(x: number, y: number, rotation: number) {
  const angle = (rotation * Math.PI) / 180
  return new THREE.Vector3(
    x * Math.cos(angle) - y * Math.sin(angle),
    x * Math.sin(angle) + y * Math.cos(angle),
    0,
  )
}

const cases = stories.map(({ rotation, circuit }) => ({
  rotation,
  circuit,
  drillPoints: originalHoles.flatMap((hole) =>
    drillProbes.map(([u, v]) => ({
      label: `${hole.pcb_plated_hole_id}: ${u},${v}`,
      point: rotatePoint(
        hole.x + u * hole.hole_width!,
        hole.y + v * hole.hole_height!,
        rotation,
      ),
    })),
  ),
  copperPoints: polygonPads.map((pad) => ({
    ring: rotatePoint(pad.x - 1.05, pad.y + 0.01, rotation),
    outside: rotatePoint(pad.x + 0.05, pad.y - 0.85, rotation),
  })),
}))

function getCase(rotation: number) {
  return cases.find((entry) => entry.rotation === rotation)!
}

let manifoldPromise: ReturnType<typeof ManifoldModule> | undefined

async function buildMeshes(
  engine: "jscad" | "manifold",
  circuit: AnyCircuitElement[],
) {
  const geometries: THREE.BufferGeometry[] = []
  if (engine === "jscad") {
    const builder = new BoardGeomBuilder(circuit, () => {})
    while (!builder.step(100)) {}
    for (const geom of builder.getGeoms()) {
      geometries.push(createGeometryFromPolygons(geom3.toPolygons(geom)))
    }
  } else {
    if (!manifoldPromise) {
      manifoldPromise = ManifoldModule().then((module) => {
        module.setup()
        return module
      })
    }
    const { Manifold, CrossSection } = await manifoldPromise
    const cleanup: { delete(): void }[] = []
    const board = circuit.find((element) => element.type === "pcb_board")!
    const result = processPlatedHolesForManifold(
      Manifold,
      CrossSection,
      circuit,
      board.thickness!,
      cleanup,
    )
    try {
      const { boardOp } = createManifoldBoard(
        Manifold,
        CrossSection,
        board,
        board.thickness!,
        cleanup,
      )
      // Match the viewer: drill the board and all overlapping plated copper.
      const drills = Manifold.union(result.platedHoleBoardDrills)
      cleanup.push(drills)
      const subtraction = Manifold.union([drills, result.platedHoleSubtractOp])
      cleanup.push(subtraction)
      const drilledBoard = boardOp.subtract(subtraction)
      const drilledCopper = result.platedHoleSubtractOp.subtract(drills)
      cleanup.push(drilledBoard, drilledCopper)
      geometries.push(
        manifoldMeshToThreeGeometry(drilledBoard.getMesh()),
        manifoldMeshToThreeGeometry(drilledCopper.getMesh()),
      )
    } finally {
      for (const { geometry } of result.platedHoleCopperGeoms)
        geometry.dispose()
      for (const op of new Set(cleanup)) op.delete()
    }
  }
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  return {
    meshes: geometries.map((geometry) => new THREE.Mesh(geometry, material)),
    dispose() {
      for (const geometry of geometries) geometry.dispose()
      material.dispose()
    },
  }
}

function intersections(meshes: THREE.Mesh[], point: THREE.Vector3, side = 1) {
  return new THREE.Raycaster(
    new THREE.Vector3(point.x, point.y, side * 3),
    new THREE.Vector3(0, 0, -side),
  ).intersectObjects(meshes, false)
}

export function expectStoryRotation(rotation: number) {
  const { circuit } = getCase(rotation)
  expect(originalHoles).toHaveLength(6)
  const pads = circuit.filter(
    (element): element is PcbHoleWithPolygonPad =>
      element.type === "pcb_plated_hole" &&
      element.shape === "hole_with_polygon_pad",
  )
  expect(pads).toHaveLength(2)
  for (const [index, pad] of pads.entries()) {
    const original = polygonPads[index]!
    const position = rotatePoint(original.x, original.y, rotation)
    expect(pad.ccw_rotation).toBeCloseTo(rotation)
    expect(pad.pad_outline).toEqual(original.pad_outline)
    expect(pad.x).toBeCloseTo(position.x)
    expect(pad.y).toBeCloseTo(position.y)
  }
}

export async function expectGeometryRotation(
  engine: "jscad" | "manifold",
  rotation: number,
) {
  const { circuit, drillPoints, copperPoints } = getCase(rotation)
  const model = await buildMeshes(engine, circuit)
  try {
    for (const { point, label } of drillPoints) {
      for (const side of [1, -1]) {
        expect(
          intersections(model.meshes, point, side),
          `${label}, side ${side}`,
        ).toHaveLength(0)
      }
    }
    const copper = model.meshes.slice(1)
    for (const { ring, outside } of copperPoints) {
      expect(intersections(copper, ring).length).toBeGreaterThan(0)
      expect(intersections(copper, outside)).toHaveLength(0)
    }
  } finally {
    model.dispose()
  }
}

export function expectDrillTransparency(rotation: number, showMask: boolean) {
  const { circuit, drillPoints, copperPoints } = getCase(rotation)
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })
  const board = circuit.find((element) => element.type === "pcb_board")!
  const bounds = calculateOutlineBounds(board)
  const resolution = 100
  let textures: ReturnType<typeof createCombinedBoardTextures> = {}
  try {
    textures = createCombinedBoardTextures({
      circuitJson: circuit,
      boardData: board,
      traceTextureResolution: resolution,
      visibility: { topMask: showMask, bottomMask: showMask },
    })
    for (const layer of ["top", "bottom"] as const) {
      const texture = (
        layer === "top" ? textures.topBoard : textures.bottomBoard
      )!
      const ctx = texture.image.getContext("2d")
      const alphaAt = (point: THREE.Vector3) =>
        ctx.getImageData(
          Math.floor((point.x - bounds.minX) * resolution),
          Math.floor(
            (layer === "top" ? bounds.maxY - point.y : point.y - bounds.minY) *
              resolution,
          ),
          1,
          1,
        ).data[3]
      for (const { point, label } of drillPoints) {
        expect(alphaAt(point), `${layer}: ${label}`).toBe(0)
      }
      for (const { ring } of copperPoints) expect(alphaAt(ring)).toBe(255)
    }
  } finally {
    for (const texture of Object.values(textures)) texture?.dispose()
    Object.assign(globalThis, { document: previousDocument })
  }
}
