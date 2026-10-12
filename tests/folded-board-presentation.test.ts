import { expect, test } from "bun:test"
import { createPcbFold } from "@tscircuit/flex-utils"
import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
import {
  getFoldedBoardPresentation,
  transformPresentationBounds,
} from "../src/utils/folded-board-presentation"

const fixture = (middleCount = 3, bottom = false): AnyCircuitElement[] =>
  [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 50,
      height: 10,
      thickness: 0.2,
    },
    ...[-10, 10].map((x, index) => ({
      type: "pcb_bend",
      pcb_bend_id: `bend-${index}`,
      pcb_board_id: "board",
      start: { x, y: -5 },
      end: { x, y: 5 },
      bend_radius: 1,
      bend_angle: 180,
      bend_side: "right",
    })),
    ...[-20, ...Array.from({ length: middleCount }, () => 0), 20].map(
      (x, index) => ({
        type: "pcb_component",
        pcb_component_id: `part-${index}`,
        source_component_id: `source-${index}`,
        center: { x, y: index / 10 },
        width: 1,
        height: 1,
        layer: bottom ? "bottom" : "top",
        rotation: 0,
      }),
    ),
  ] as AnyCircuitElement[]

test("the primary rigid panel faces up without rewriting manufacturing JSON", () => {
  const json = fixture()
  const before = JSON.stringify(json)
  const matrix = getFoldedBoardPresentation(json, true)
  const fold = createPcbFold(
    json.filter((e) => e.type === "pcb_bend"),
    0.2,
  )
  const normal = fold.direction({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 })
  const up = new THREE.Vector3(normal.x, normal.y, normal.z).transformDirection(
    matrix,
  )
  expect(up.distanceTo(new THREE.Vector3(0, 0, 1))).toBeLessThan(1e-10)
  expect(matrix.determinant()).toBeCloseTo(1, 10)
  expect(JSON.stringify(json)).toBe(before)
  getFoldedBoardPresentation([...json].reverse(), true).elements.forEach(
    (value, index) => expect(value).toBeCloseTo(matrix.elements[index]!, 12),
  )
})

test("opposite coplanar end panels are not counted as one panel", () => {
  // Two end components combined would tie the two-component primary panel.
  const matrix = getFoldedBoardPresentation(fixture(2), true)
  expect(matrix.equals(new THREE.Matrix4())).toBe(false)
})

test("unfolded views, a population tie and the authored-frame override stay unchanged", () => {
  for (const matrix of [
    getFoldedBoardPresentation(fixture(), false),
    getFoldedBoardPresentation(fixture(1), true),
    getFoldedBoardPresentation(fixture(), true, "as-authored"),
    getFoldedBoardPresentation(
      fixture().filter((e) => e.type !== "pcb_bend"),
      true,
    ),
  ])
    expect(matrix.equals(new THREE.Matrix4())).toBe(true)
})

test("a populated bottom face and an already upward primary panel keep correct polarity", () => {
  // The middle panel's bottom side already faces upward after the first bend.
  expect(
    getFoldedBoardPresentation(fixture(3, true), true).equals(
      new THREE.Matrix4(),
    ),
  ).toBe(true)
  const json = fixture()
  for (const e of json)
    if (e.type === "pcb_component" && e.center.x === 0) e.center.x = -20
  expect(
    getFoldedBoardPresentation(json, true).equals(new THREE.Matrix4()),
  ).toBe(true)
})

test("component anchors in a curved bend band do not define a rigid presentation frame", () => {
  const json = fixture(1)
  for (let i = 0; i < 8; i++)
    json.push({
      type: "pcb_component",
      pcb_component_id: `bad-${i}`,
      source_component_id: `bad-source-${i}`,
      center: { x: -10, y: 0 },
      width: 1,
      height: 1,
      layer: "top",
      rotation: 0,
    } as AnyCircuitElement)
  expect(
    getFoldedBoardPresentation(json, true).equals(new THREE.Matrix4()),
  ).toBe(true)
})

test("one proper rigid transform preserves assembly distances and encloses all eight bound corners", () => {
  const matrix = getFoldedBoardPresentation(fixture(), true)
  const positions = [
    new THREE.Vector3(2, -4, 7),
    new THREE.Vector3(-3, 8, -1),
    new THREE.Vector3(4, 2, 0),
  ]
  for (const a of positions)
    for (const b of positions) {
      expect(
        a
          .clone()
          .applyMatrix4(matrix)
          .distanceTo(b.clone().applyMatrix4(matrix)),
      ).toBeCloseTo(a.distanceTo(b), 10)
    }
  const input = { minX: -25, maxX: 25, minY: -5, maxY: 5, minZ: -0.1, maxZ: 3 }
  const bounds = transformPresentationBounds(input, matrix)!
  for (const x of [input.minX, input.maxX])
    for (const y of [input.minY, input.maxY])
      for (const z of [input.minZ, input.maxZ]) {
        const p = new THREE.Vector3(x, y, z).applyMatrix4(matrix)
        expect(p.x).toBeGreaterThanOrEqual(bounds.minX - 1e-10)
        expect(p.x).toBeLessThanOrEqual(bounds.maxX + 1e-10)
        expect(p.y).toBeGreaterThanOrEqual(bounds.minY - 1e-10)
        expect(p.y).toBeLessThanOrEqual(bounds.maxY + 1e-10)
        expect(p.z).toBeGreaterThanOrEqual(bounds.minZ - 1e-10)
        expect(p.z).toBeLessThanOrEqual(bounds.maxZ + 1e-10)
      }
})
