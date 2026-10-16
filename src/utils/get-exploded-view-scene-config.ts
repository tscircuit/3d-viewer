import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
import type { ExplodedViewSceneConfig } from "./exploded-view-types"

const getExplodeOffset = (explodeOffset: unknown) => {
  if (!explodeOffset || typeof explodeOffset !== "object") {
    return undefined
  }
  if (
    !("x" in explodeOffset) ||
    !("y" in explodeOffset) ||
    !("z" in explodeOffset) ||
    typeof explodeOffset.x !== "number" ||
    typeof explodeOffset.y !== "number" ||
    typeof explodeOffset.z !== "number"
  ) {
    return undefined
  }
  const offset = new THREE.Vector3(
    explodeOffset.x,
    explodeOffset.y,
    explodeOffset.z,
  )
  if (
    !Number.isFinite(offset.x) ||
    !Number.isFinite(offset.y) ||
    !Number.isFinite(offset.z) ||
    offset.lengthSq() === 0
  ) {
    return undefined
  }
  return offset
}

export const getExplodedViewSceneConfig = (
  circuitJson: AnyCircuitElement[],
): ExplodedViewSceneConfig => {
  const parts: ExplodedViewSceneConfig["parts"] = []

  for (const element of circuitJson) {
    if (element.type !== "cad_component") continue
    if (!("explode_offset" in element)) continue
    const offset = getExplodeOffset(element.explode_offset)
    if (!offset) continue
    parts.push({ cadComponentId: element.cad_component_id, offset })
  }

  return { parts }
}
