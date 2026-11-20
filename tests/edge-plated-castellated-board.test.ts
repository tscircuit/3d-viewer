import { expect, test } from "bun:test"
import { intersect } from "@jscad/modeling/src/operations/booleans"
import { measureVolume } from "@jscad/modeling/src/measurements"
import { cuboid } from "@jscad/modeling/src/primitives"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import ManifoldModule from "manifold-3d"
import * as THREE from "three"
import { BoardGeomBuilder } from "../src/BoardGeomBuilder"
import { withCastellatedOutlinePlatedHoles } from "../src/utils/castellated-outline-holes"
import { processEdgePlatedPadsForManifold } from "../src/utils/edge-plated-pads"
import { createManifoldBoard } from "../src/utils/manifold/create-manifold-board"
import { processPlatedHolesForManifold } from "../src/utils/manifold/process-plated-holes"
import { manifoldMeshToThreeGeometry } from "../src/utils/manifold-mesh-to-three-geometry"

test("withCastellatedOutlinePlatedHoles preserves reference when no castellated points exist", () => {
  const plainCircuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "b0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      outline: [
        { x: -5, y: -5 },
        { x: 5, y: -5 },
        { x: 5, y: 5 },
        { x: -5, y: 5 },
      ],
    },
  ]
  expect(withCastellatedOutlinePlatedHoles(plainCircuit)).toBe(plainCircuit)
})

test("castellated board outline points drill the board edge and render semicircular rim copper in Manifold and JSCAD", async () => {
  const castellatedCircuit = [
    {
      type: "pcb_board",
      pcb_board_id: "board_cast",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      outline: [
        { x: -5, y: -5 },
        {
          x: -5,
          y: 0,
          isCastellatedHole: true,
          holeDiameter: "0.8mm",
          padDiameter: "1.4mm",
        },
        { x: -5, y: 5 },
        { x: 5, y: 5 },
        { x: 5, y: -5 },
      ],
    },
  ] as unknown as AnyCircuitElement[]

  // JSCAD builder verification
  const jscadBuilder = new BoardGeomBuilder(castellatedCircuit, () => {})
  while (!jscadBuilder.step(100)) {}
  const jscadGeoms = jscadBuilder.getGeoms()
  expect(jscadGeoms.length).toBe(2)

  const drillInteriorProbe = cuboid({
    center: [-4.8, 0, 0],
    size: [0.2, 0.2, 1],
  })
  expect(
    Math.abs(measureVolume(intersect(jscadGeoms[0]!, drillInteriorProbe))),
  ).toBeLessThan(1e-8)

  const barrelRimProbe = cuboid({
    center: [-4.45, 0, 0],
    size: [0.2, 0.2, 1],
  })
  expect(
    measureVolume(intersect(jscadGeoms[1]!, barrelRimProbe)),
  ).toBeGreaterThan(0.01)

  // Manifold builder verification
  const module = await ManifoldModule()
  module.setup()
  const { Manifold, CrossSection } = module
  const cleanup: any[] = []
  try {
    const board = castellatedCircuit[0] as PcbBoard
    const { boardOp, outlineCrossSection } = createManifoldBoard(
      Manifold,
      CrossSection,
      board,
      1.6,
      cleanup,
    )
    const clipCs = outlineCrossSection!.offset(0.01)
    cleanup.push(clipCs)
    const clipOp = Manifold.extrude(
      clipCs,
      3.6,
      undefined,
      undefined,
      undefined,
      true,
    )
    cleanup.push(clipOp)

    const { platedHoleBoardDrills, platedHoleSubtractOp } =
      processPlatedHolesForManifold(
        Manifold,
        CrossSection,
        castellatedCircuit,
        1.6,
        cleanup,
        clipOp,
      )
    expect(platedHoleBoardDrills).toHaveLength(1)
    expect(platedHoleSubtractOp).toBeDefined()

    const drillUnion = Manifold.union(platedHoleBoardDrills)
    const totalSub = Manifold.union([drillUnion, platedHoleSubtractOp])
    const cutBoard = boardOp.subtract(totalSub)
    const cutCopper = platedHoleSubtractOp.subtract(drillUnion)
    cleanup.push(drillUnion, totalSub, cutBoard, cutCopper)

    const boardMesh = new THREE.Mesh(
      manifoldMeshToThreeGeometry(cutBoard.getMesh()),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    )
    const copperMesh = new THREE.Mesh(
      manifoldMeshToThreeGeometry(cutCopper.getMesh()),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    )

    // Side-on ray along +X into the castellated notch at y = 0, z = 0 hits copper before FR4.
    const sideRay = new THREE.Raycaster(
      new THREE.Vector3(-8, 0, 0),
      new THREE.Vector3(1, 0, 0),
    )
    const copperHits = sideRay.intersectObject(copperMesh)
    const boardHits = sideRay.intersectObject(boardMesh)
    expect(copperHits.length).toBeGreaterThan(0)
    expect(boardHits.length).toBeGreaterThan(0)
    expect(copperHits[0]!.distance).toBeLessThan(boardHits[0]!.distance)

    boardMesh.geometry.dispose()
    copperMesh.geometry.dispose()
    boardMesh.material.dispose()
    copperMesh.material.dispose()
  } finally {
    for (const op of new Set(cleanup)) op.delete()
  }
})

test("overhanging polygon and rect SMT pads render side-face rim copper without affecting interior pads", async () => {
  const radius = 20
  const circleOutline = Array.from({ length: 64 }, (_, i) => {
    const theta = (2 * Math.PI * i) / 64
    return { x: radius * Math.cos(theta), y: radius * Math.sin(theta) }
  })

  // Trapezoidal edge-plated pad extending 0.5mm past the +X rim of a 40mm circular board (#3297)
  const edgePadPoints = [
    { x: 18.5, y: -1.0 },
    { x: 20.5, y: -1.0 },
    { x: 20.5, y: 1.0 },
    { x: 18.5, y: 1.0 },
  ]

  const circuitWithEdgeAndInteriorPads: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "circle_board",
      center: { x: 0, y: 0 },
      width: 40,
      height: 40,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      outline: circleOutline,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "edge_top",
      shape: "polygon",
      layer: "top",
      points: edgePadPoints,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "edge_bottom",
      shape: "polygon",
      layer: "bottom",
      points: edgePadPoints,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "interior_pad",
      shape: "rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
    },
  ]

  // JSCAD verification
  const jscadBuilder = new BoardGeomBuilder(
    circuitWithEdgeAndInteriorPads,
    () => {},
  )
  while (!jscadBuilder.step(100)) {}
  const jscadGeoms = jscadBuilder.getGeoms()
  expect(jscadGeoms.length).toBe(2)
  const rimProbe = cuboid({ center: [19.98, 0, 0], size: [0.06, 1.0, 1.2] })
  expect(measureVolume(intersect(jscadGeoms[1]!, rimProbe))).toBeGreaterThan(
    0.001,
  )

  // Manifold verification
  const module = await ManifoldModule()
  module.setup()
  const { Manifold, CrossSection } = module
  const cleanup: any[] = []
  try {
    const board = circuitWithEdgeAndInteriorPads[0] as PcbBoard
    const { boardOp } = createManifoldBoard(
      Manifold,
      CrossSection,
      board,
      1.6,
      cleanup,
    )
    const { edgePlatedCopperOp, edgePlatedSubtractOp } =
      processEdgePlatedPadsForManifold({
        Manifold,
        CrossSection,
        circuitJson: circuitWithEdgeAndInteriorPads,
        boards: [board],
        pcbThickness: 1.6,
        manifoldInstancesForCleanup: cleanup,
      })

    expect(edgePlatedCopperOp).not.toBeNull()
    expect(edgePlatedSubtractOp).not.toBeNull()

    const recessedBoard = boardOp.subtract(edgePlatedSubtractOp)
    cleanup.push(recessedBoard)

    const boardMesh = new THREE.Mesh(
      manifoldMeshToThreeGeometry(recessedBoard.getMesh()),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    )
    const copperMesh = new THREE.Mesh(
      manifoldMeshToThreeGeometry(edgePlatedCopperOp.getMesh()),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    )

    // Ray inward from (+25, 0, 0) at the plated +X rim hits copper before recessed FR4
    const platedRimRay = new THREE.Raycaster(
      new THREE.Vector3(25, 0, 0),
      new THREE.Vector3(-1, 0, 0),
    )
    const copperHits = platedRimRay.intersectObject(copperMesh)
    const boardHits = platedRimRay.intersectObject(boardMesh)
    expect(copperHits.length).toBeGreaterThan(0)
    expect(boardHits.length).toBeGreaterThan(0)
    expect(copperHits[0]!.distance).toBeLessThan(boardHits[0]!.distance)

    // Ray inward from (0, 25, 0) along -Y on the unplated +Y rim hits no edge copper
    const unplatedRimRay = new THREE.Raycaster(
      new THREE.Vector3(0, 25, 0),
      new THREE.Vector3(0, -1, 0),
    )
    expect(unplatedRimRay.intersectObject(copperMesh)).toHaveLength(0)

    // Interior-only board produces null edgePlatedCopperOp
    const interiorOnlyResult = processEdgePlatedPadsForManifold({
      Manifold,
      CrossSection,
      circuitJson: [board, circuitWithEdgeAndInteriorPads[3]!],
      boards: [board],
      pcbThickness: 1.6,
      manifoldInstancesForCleanup: cleanup,
    })
    expect(interiorOnlyResult.edgePlatedCopperOp).toBeNull()

    boardMesh.geometry.dispose()
    copperMesh.geometry.dispose()
    boardMesh.material.dispose()
    copperMesh.material.dispose()
  } finally {
    for (const op of new Set(cleanup)) op.delete()
  }
})
