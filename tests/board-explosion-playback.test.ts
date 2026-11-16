import { expect, test } from "bun:test"
import { getCircuitJsonAssemblyExplosion } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { Matrix4, Vector3 } from "three"
import { createBoardPlayback } from "../src/assembly-explosion/board-playback"
import type { RigidExplosionView } from "../src/assembly-explosion/rotation-playback"

const pcb: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "pcb_board_0",
  center: { x: 7, y: -4 },
  thickness: 1.6,
  num_layers: 4,
  material: "fr4",
}

const lift: AnyCircuitElement = {
  type: "cad_explosion_stage",
  cad_explosion_stage_id: "cad_explosion_stage_0",
  name: "lift",
  order: 0,
  cad_component_ids: [],
}

const slide: AnyCircuitElement = {
  type: "cad_explosion_stage",
  cad_explosion_stage_id: "cad_explosion_stage_1",
  name: "slide",
  order: 1,
  cad_component_ids: [],
}

test("PCB playback accumulates completed stages and guides the board from its midplane", () => {
  const assembled = [pcb, slide, lift]
  const apply = createBoardPlayback(assembled, [
    { stageName: "lift", pcbBoardId: "pcb_board_0", translation: [0, 0, 12] },
    { stageName: "slide", pcbBoardId: "pcb_board_0", translation: [10, 0, 0] },
  ])
  const assemblyTransforms = new Map([["cad_component_0", new Matrix4()]])
  const view: RigidExplosionView = {
    ...getCircuitJsonAssemblyExplosion(assembled),
    assemblyTransforms,
  }
  const result = apply(view, { throughStageRef: "slide", stageProgress: 0.5 })
  expect(
    new Vector3()
      .setFromMatrixPosition(result.pcbBoardTransforms!.get("pcb_board_0")!)
      .toArray(),
  ).toEqual([5, 0, 12])
  expect(result.pcbBoardLines).toEqual([
    {
      points: [
        { x: 7, y: -4, z: 0 },
        { x: 7, y: -4, z: 12 },
      ],
    },
    {
      points: [
        { x: 7, y: -4, z: 12 },
        { x: 12, y: -4, z: 12 },
      ],
    },
  ])
  expect(result.circuitJson).toBe(view.circuitJson)
  expect(result.assemblyTransforms).toBe(assemblyTransforms)
})

test("PCB playback starts at the assembled pose when the first stage is at zero progress", () => {
  const assembled = [pcb, lift]
  const play = createBoardPlayback(assembled, [
    { stageName: "lift", pcbBoardId: "pcb_board_0", translation: [0, 0, 12] },
  ])
  const result = play(getCircuitJsonAssemblyExplosion(assembled), {
    throughStageRef: "lift",
    stageProgress: 0,
  })
  expect(result.pcbBoardTransforms?.size).toBe(0)
  expect(result.pcbBoardLines).toEqual([])
})

test("PCB playback rejects a move for a missing board", () => {
  expect(() =>
    createBoardPlayback(
      [pcb, lift],
      [
        {
          stageName: "lift",
          pcbBoardId: "pcb_board_9",
          translation: [0, 0, 12],
        },
      ],
    ),
  ).toThrow('Unknown PCB board "pcb_board_9"')
})

test("PCB playback shares the board transform with its fitted CAD and leaves the enclosure separate", () => {
  const assembled: AnyCircuitElement[] = [
    lift,
    pcb,
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      center: { x: 8, y: 0 },
      layer: "top",
      rotation: 0,
      width: 2,
      height: 1,
      obstructs_within_bounds: true,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_0",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      position: { x: 8, y: 0, z: 0.8 },
      anchor_alignment: "center_of_component_on_board_surface",
      model_object_fit: "contain_within_bounds",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_1",
      source_component_id: "source_component_1",
      position: { x: 8, y: 0, z: 2 },
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
    },
  ]
  const apply = createBoardPlayback(assembled, [
    { stageName: "lift", pcbBoardId: "pcb_board_0", translation: [0, 0, 12] },
  ])
  const { pcbBoardTransforms } = apply(
    getCircuitJsonAssemblyExplosion(assembled),
  )
  expect(pcbBoardTransforms?.size).toBe(2)
  expect(pcbBoardTransforms!.get("cad_component_0")!).toBe(
    pcbBoardTransforms!.get("pcb_board_0")!,
  )
  expect(pcbBoardTransforms?.has("cad_component_1")).toBe(false)
})

test("PCB playback rejects moves when the scene renders multiple boards together", () => {
  expect(() =>
    createBoardPlayback(
      [pcb, { ...pcb, pcb_board_id: "pcb_board_1" }, lift],
      [
        {
          stageName: "lift",
          pcbBoardId: "pcb_board_0",
          translation: [0, 0, 12],
        },
      ],
    ),
  ).toThrow("Explosion PCB moves require one unpanelized board")
})
