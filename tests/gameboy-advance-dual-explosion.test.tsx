import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { getCircuitJsonAssemblyExplosion } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { buildGameboyAssembly } from "../stories/fixtures/gameboy-advance-dual-assembly/build"
import {
  mechanicalParts,
  explosionStages,
  removalGroups,
} from "../stories/fixtures/gameboy-advance-dual-assembly/assembly"
import generation from "../stories/fixtures/gameboy-advance-dual-assembly/generation.json"

const load = (): Promise<AnyCircuitElement[]> =>
  Bun.file(
    new URL(
      "../stories/fixtures/gameboy-advance-dual-assembly/assembled.circuit.json",
      import.meta.url,
    ),
  ).json()
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex")

test("GBA dual fixture preserves the pinned release and reproduces its native TSX program", async () => {
  const assembled = await load()
  expect(hash(assembled)).toBe(generation.assembledSha256)
  const audit = await Bun.file(
    new URL(
      "../stories/fixtures/gameboy-advance-dual-assembly/clearance-report.json",
      import.meta.url,
    ),
  ).json()
  expect(audit.assembledSha256).toBe(generation.assembledSha256)
  const ids = assembled
    .map((e) => (e as unknown as Record<string, unknown>)[`${e.type}_id`])
    .filter(Boolean)
  expect(new Set(ids).size).toBe(ids.length)
  const original = assembled
    .slice(0, generation.originalRecordCount)
    .map((e) => {
      if (e.type !== "cad_component") return e
      return Object.fromEntries(
        Object.entries(e).map(([key, value]) => {
          if (
            key.startsWith("model_") &&
            key.endsWith("_url") &&
            typeof value === "string" &&
            value.startsWith(
              "https://api.tscircuit.com/package_files/download?",
            )
          ) {
            const url = new URL(value)
            expect(url.searchParams.get("package_release_id")).toBe(
              generation.packageReleaseId,
            )
            return [key, `./${url.searchParams.get("file_path")}`]
          }
          return [key, value]
        }),
      ) as AnyCircuitElement
    })
  expect(hash(original)).toBe(generation.originalSha256)
  expect(await buildGameboyAssembly(original)).toEqual(assembled)
  expect(assembled.filter((e) => e.type === "cad_component")).toHaveLength(285)
  const moving = removalGroups
    .slice(0, 3)
    .flatMap((s) => s.parts.map((p) => p.id))
  expect(new Set(moving).size).toBe(moving.length)
  expect(moving.sort()).toEqual(mechanicalParts.map((p) => p.id).sort())
}, 30_000)

test("all authored offsets apply while PCB records remain fixed at every stage", async () => {
  const assembled = await load()
  const mechanicalIds = new Set(
    assembled
      .filter((e) => e.type === "cad_component")
      .filter((e) => !e.pcb_component_id)
      .map((e) => e.cad_component_id),
  )
  const fixed = (json: AnyCircuitElement[]) =>
    json.filter(
      (e) =>
        !e.type.startsWith("cad_explosion_") &&
        (e.type !== "cad_component" || !mechanicalIds.has(e.cad_component_id)),
    )
  for (const stage of assembled.filter(
    (e) => e.type === "cad_explosion_stage",
  )) {
    for (const progress of [0.5, 1]) {
      const view = getCircuitJsonAssemblyExplosion(assembled, {
        throughStageRef: stage.name,
        stageProgress: progress,
      })
      expect(fixed(view.circuitJson)).toEqual(fixed(assembled))
    }
  }
  const final = getCircuitJsonAssemblyExplosion(assembled).circuitJson
  const sources = new Map(
    assembled
      .filter((e) => e.type === "source_component")
      .map((e) => [e.name, e.source_component_id]),
  )
  for (const part of mechanicalParts) {
    const source = sources.get(part.id.replaceAll("-", "_"))
    const base = assembled.find(
      (e) => e.type === "cad_component" && e.source_component_id === source,
    )
    const moved = final.find(
      (e) => e.type === "cad_component" && e.source_component_id === source,
    )
    if (base?.type !== "cad_component" || moved?.type !== "cad_component")
      throw new Error(`Missing ${part.id}`)
    expect([
      moved.position.x - base.position.x,
      moved.position.y - base.position.y,
      moved.position.z - base.position.z,
    ]).toEqual(
      explosionStages
        .flatMap((stage) => stage.moves)
        .reduce(
          (offset, move) => {
            if (!move.names.includes(part.id.replaceAll("-", "_")))
              return offset
            return offset.map(
              (value, axis) => value + (move?.offset[axis] ?? 0),
            )
          },
          [0, 0, 0],
        ),
    )
  }
})

test("user items leave first and each complete group parks left before the next removal", async () => {
  const json = await load()
  expect(removalGroups[0]!.parts.map((p) => p.id).sort()).toEqual(
    [
      "battery-door",
      "aa-0",
      "aa-1",
      "aa-2",
      "aa-3",
      "micro-sd-card",
      "usb-c-cable",
    ].sort(),
  )
  expect(removalGroups[1]!.name).toBe("rear-housing")
  expect(removalGroups[2]!.name).toBe("front-assembly")
  const stages = json.filter((e) => e.type === "cad_explosion_stage")
  expect(stages.map((s) => s.name)).toEqual(
    removalGroups.flatMap((g) => [
      `EnclosureR43.remove-${g.name}`,
      `EnclosureR43.park-${g.name}-left`,
    ]),
  )
  for (let i = 0; i < stages.length; i += 2) {
    const removal = stages[i]!
    const parking = stages[i + 1]!
    expect([...parking.cad_component_ids].sort()).toEqual(
      [...removal.cad_component_ids].sort(),
    )
    const moves = json
      .filter((e) => e.type === "cad_explosion_move")
      .filter(
        (e) => e.cad_explosion_stage_id === parking.cad_explosion_stage_id,
      )
    expect(moves.length).toBeGreaterThanOrEqual(1)
    expect(moves[0]!.translation.x).toBeLessThan(0)
    const before = getCircuitJsonAssemblyExplosion(json, {
      throughStageRef: removal.name,
    }).circuitJson
    const halfway = getCircuitJsonAssemblyExplosion(json, {
      throughStageRef: parking.name,
      stageProgress: 0.5 / moves.length,
    }).circuitJson
    for (const id of parking.cad_component_ids) {
      const a = before.find(
        (e) => e.type === "cad_component" && e.cad_component_id === id,
      )
      const b = halfway.find(
        (e) => e.type === "cad_component" && e.cad_component_id === id,
      )
      if (a?.type !== "cad_component" || b?.type !== "cad_component")
        throw new Error(id)
      expect(b.position.x - a.position.x).toBe(moves[0]!.translation.x / 2)
    }
  }
})

test("every parking segment has continuous bounding-box clearance from other rendered parts", async () => {
  const json = await load()
  const bounds = (await Bun.file(
    new URL(
      "../stories/fixtures/gameboy-advance-dual-assembly/rendered-bounds.json",
      import.meta.url,
    ),
  ).json()) as Record<string, [number[], number[]]>
  const offsets = new Map(Object.keys(bounds).map((id) => [id, [0, 0, 0]]))
  const stages = new Map(
    json
      .filter((e) => e.type === "cad_explosion_stage")
      .map((e) => [e.cad_explosion_stage_id, e.name]),
  )
  // Continuous slab intersection over the whole translation, not frame samples.
  const intersects = (a: number[][], b: number[][], delta: number[]) => {
    let enter = 0,
      leave = 1
    for (let axis = 0; axis < 3; axis++) {
      if (delta[axis] === 0) {
        if (a[1]![axis]! <= b[0]![axis]! || a[0]![axis]! >= b[1]![axis]!)
          return false
      } else {
        const times = [
          (b[0]![axis]! - a[1]![axis]!) / delta[axis]!,
          (b[1]![axis]! - a[0]![axis]!) / delta[axis]!,
        ].sort((a, b) => a - b)
        enter = Math.max(enter, times[0]!)
        leave = Math.min(leave, times[1]!)
      }
    }
    return leave > enter
  }
  const translated = (id: string) =>
    bounds[id]!.map((p) => p.map((v, axis) => v + offsets.get(id)![axis]!))
  for (const move of json.filter((e) => e.type === "cad_explosion_move")) {
    const targets = move.targets.map((t) => {
      if (t.type !== "cad_component")
        throw new Error("Expected explicit CAD target")
      expect(bounds[t.cad_component_id]).toBeDefined()
      return t.cad_component_id
    })
    const delta = [move.translation.x, move.translation.y, move.translation.z]
    if (stages.get(move.cad_explosion_stage_id)!.includes(".park-")) {
      for (const target of targets)
        for (const obstacle of Object.keys(bounds)) {
          if (targets.includes(obstacle)) continue
          expect(
            intersects(translated(target), translated(obstacle), delta),
            `${stages.get(move.cad_explosion_stage_id)}: ${target} vs ${obstacle}`,
          ).toBe(false)
        }
    }
    for (const id of targets)
      offsets.set(
        id,
        offsets.get(id)!.map((v, axis) => v + delta[axis]!),
      )
  }
})
