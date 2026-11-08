import { Circuit, getCircuitJsonAssemblyExplosion } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { GameBoyEnclosure } from "./assembly"

export const packageReleaseId = "f18f9b16-dac9-4c8d-9be5-0829dc6eb3c0"
export function resolveAssetUrl(url: string) {
  if (!url.startsWith("./")) return url
  return `https://api.tscircuit.com/package_files/download?${new URLSearchParams(
    {
      package_release_id: packageReleaseId,
      file_path: url.slice(2),
    },
  )}`
}

/** Preserve the published routed board and geometry; append only the program. */
export async function buildGameboyAssembly(original: AnyCircuitElement[]) {
  if (original.some((e) => e.type.startsWith("cad_explosion_")))
    throw new Error(
      "Expected the original published circuit without explosion stages",
    )
  const circuit = new Circuit()
  circuit.add(<GameBoyEnclosure />)
  await circuit.renderUntilSettled()
  const generated = circuit.getCircuitJson()
  const namedCad = (json: AnyCircuitElement[]) => {
    const names = new Map(
      json
        .filter((e) => e.type === "source_component")
        .map((e) => [e.source_component_id, e.name]),
    )
    return json
      .filter((e) => e.type === "cad_component")
      .filter((e) => !e.pcb_component_id)
      .map((e) => ({
        name: names.get(e.source_component_id!),
        id: e.cad_component_id,
      }))
  }
  const originals = namedCad(original)
  const ids = new Map<string, string>()
  for (const part of namedCad(generated)) {
    const matches = originals.filter((e) => e.name === part.name)
    if (matches.length !== 1)
      throw new Error(`Expected one original CAD part for ${part.name}`)
    ids.set(part.id, matches[0]!.id)
  }
  const program = generated.filter((e) => e.type.startsWith("cad_explosion_"))
  for (const e of program) {
    const id = (e as unknown as Record<string, string>)[`${e.type}_id`]!
    ids.set(id, `gba_dual_${id}`)
  }
  const remap = (value: unknown): unknown => {
    if (typeof value === "string") return ids.get(value) ?? value
    if (Array.isArray(value)) return value.map(remap)
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, remap(v)]),
      )
    return value
  }
  const result = original.map((e) =>
    e.type !== "cad_component"
      ? e
      : (Object.fromEntries(
          Object.entries(e).map(([key, value]) => [
            key,
            key.startsWith("model_") &&
            key.endsWith("_url") &&
            typeof value === "string"
              ? resolveAssetUrl(value)
              : value,
          ]),
        ) as AnyCircuitElement),
  )
  result.push(...(remap(program) as AnyCircuitElement[]))
  getCircuitJsonAssemblyExplosion(result)
  return result
}
