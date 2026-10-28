import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { validateExplosionSnapshot } from "../src/assembly-explosion/use-explosion-snapshot"
import assembled from "../stories/fixtures/rp2040-motor-assembly/assembled.circuit.json"
import positions from "../stories/fixtures/rp2040-motor-assembly/exploded-positions.json"

const source = assembled as unknown as AnyCircuitElement[]
const target = source.map((e) =>
  e.type === "cad_component"
    ? {
        ...e,
        position: (positions as Record<string, typeof e.position>)[
          e.cad_component_id
        ]!,
      }
    : e,
)

test("exported RP2040 pose identifies ten translations without changing source data", () => {
  const before = JSON.stringify(source)
  const moves = validateExplosionSnapshot(source, target)
  expect(moves).toHaveLength(10)
  expect(moves.every(({ base }) => !base.pcb_component_id)).toBe(true)
  expect(JSON.stringify(source)).toBe(before)
})

test("reject incompatible targets instead of displaying a partially applied explosion", () => {
  const cad = target.find((e) => e.type === "cad_component")!
  expect(() =>
    validateExplosionSnapshot(
      source,
      target.filter((e) => e !== cad),
    ),
  ).toThrow("same CAD component IDs")
  expect(() => validateExplosionSnapshot(source, [...target, cad])).toThrow(
    "same CAD component IDs",
  )
  expect(() =>
    validateExplosionSnapshot(
      source,
      target.map((e) =>
        e === cad ? ({ ...cad, position: { x: NaN, y: 0, z: 0 } } as any) : e,
      ),
    ),
  ).toThrow("finite")
  expect(() =>
    validateExplosionSnapshot(
      source,
      target.map((e) =>
        e === cad ? ({ ...cad, rotation: { x: 90, y: 0, z: 0 } } as any) : e,
      ),
    ),
  ).toThrow("translations only")
  expect(() =>
    validateExplosionSnapshot(
      source,
      target.filter((e) => e.type !== "pcb_board"),
    ),
  ).toThrow("preserve PCB")
})
