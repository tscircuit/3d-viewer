import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { getCircuitJsonAssemblyExplosion } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { buildGameboyAssembly } from "../stories/fixtures/gameboy-advance-dual-assembly/build"
import {
  mechanicalParts,
  explosionStages,
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
  const moving = explosionStages.flatMap((s) => s.parts.map((p) => p.id))
  expect(new Set(moving).size).toBe(moving.length)
  expect(moving.sort()).toEqual(
    mechanicalParts
      .filter((p) => p.explode.some((v) => v !== 0))
      .map((p) => p.id)
      .sort(),
  )
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
    ]).toEqual(part.explode)
  }
})
