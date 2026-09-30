import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
import { getCadModelTransform } from "../../src/utils/cad-model-transform"
import {
  getCadModelType,
  getRenderedCadModelType,
} from "../../src/utils/get-cad-model-type"
import { addFauxBoardIfNeeded } from "../../src/utils/preprocess-circuit-json"
import { vertexCount } from "./geometry-capture"

/** Locate, but never alter, the actual viewer subtree after its own preprocessing. */
export function findViewerTarget(
  root: THREE.Object3D,
  circuit: AnyCircuitElement[],
  targetCadId: string,
) {
  const visibleCircuit = addFauxBoardIfNeeded(circuit)
  const target = visibleCircuit.find(
    (element) =>
      element.type === "cad_component" &&
      element.cad_component_id === targetCadId,
  )
  if (!target || target.type !== "cad_component")
    throw new Error(`Missing viewer target ${targetCadId}`)
  const owner = visibleCircuit.find(
    (element) =>
      element.type === "pcb_component" &&
      element.source_component_id === target.source_component_id,
  )
  const board = visibleCircuit.find((element) => element.type === "pcb_board")
  const modelType = getCadModelType(target)
  const placement = getCadModelTransform(target, {
    layer: owner?.type === "pcb_component" ? (owner.layer ?? "top") : "top",
    pcbThickness: board?.thickness ?? 1.2,
    modelType: getRenderedCadModelType(modelType),
  })
  const anchor = new THREE.Vector3(...(placement.position ?? [0, 0, 0]))
  const groups = root.children.filter(
    (object): object is THREE.Group => object instanceof THREE.Group,
  )
  const nestedCandidates = groups.filter(
    (object) =>
      (object.children[0]?.position.distanceTo(anchor) ??
        Number.POSITIVE_INFINITY) < 0.00001,
  )
  const candidates = nestedCandidates.length
    ? nestedCandidates
        .map((object) => object.children[0])
        .filter(
          (object): object is THREE.Group => object instanceof THREE.Group,
        )
    : groups.filter((object) => object.position.distanceTo(anchor) < 0.00001)
  if (candidates.length > 1) {
    throw new Error(
      `Ambiguous viewer CAD anchor: ${candidates.length} groups for ${targetCadId}`,
    )
  }
  const candidate = candidates[0]
  if (!candidate) return null
  if (
    candidate.children.some(
      (child) => child instanceof THREE.Mesh && child.renderOrder === 999999,
    )
  ) {
    const text = candidate.children.find((child) => "text" in child)
    throw new Error(
      `Viewer model load failed: ${text && "text" in text ? String(text.text) : targetCadId}`,
    )
  }
  candidate.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const positions = child.geometry.getAttribute("position")
    if (!positions) return
    for (let index = 0; index < positions.count; index++) {
      if (
        ![
          positions.getX(index),
          positions.getY(index),
          positions.getZ(index),
        ].every(Number.isFinite)
      ) {
        throw new Error(
          `Viewer loaded non-finite ${modelType} geometry for ${targetCadId}; no substitute geometry is compared`,
        )
      }
    }
  })
  if (!vertexCount(candidate)) {
    return null
  }
  return candidate
}
