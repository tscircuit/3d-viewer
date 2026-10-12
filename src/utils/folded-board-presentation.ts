import { createPcbFold } from "@tscircuit/flex-utils"
import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
import type { Bounds3d } from "../reference-objects/reference-object"

export type FoldedBoardOrientation = "primary-panel-up" | "as-authored"

/** A viewer frame, never a change to PCB coordinates or assembled CAD poses. */
export function getFoldedBoardPresentation(
  circuitJson: AnyCircuitElement[],
  foldPcbs: boolean,
  orientation: FoldedBoardOrientation = "primary-panel-up",
): THREE.Matrix4 {
  const identity = new THREE.Matrix4()
  if (!foldPcbs || orientation === "as-authored") return identity
  const boards = circuitJson.filter((e) => e.type === "pcb_board")
  const board = boards[0]
  const bends = circuitJson.filter((e) => e.type === "pcb_bend")
  if (!board || boards.length !== 1 || !bends.length) return identity
  if (bends.some((e) => e.pcb_board_id !== board.pcb_board_id)) return identity
  const fold = createPcbFold(bends, board.thickness ?? 1.6)
  const axis = fold.bends[0]
  if (!axis) return identity

  // Separate rigid regions, including coplanar end panels. A CAD model's own
  // orientation offset must not influence which populated PCB face points up.
  const panels = new Map<
    string,
    { count: number; sum: THREE.Vector3; side: number }
  >()
  for (const component of circuitJson) {
    if (component.type !== "pcb_component" || component.do_not_place) continue
    const point = new THREE.Vector3(
      component.center.x - board.center.x,
      component.center.y - board.center.y,
      0,
    )
    const distance = point.x * axis.nx + point.y * axis.ny
    if (fold.bends.some((b) => distance > b.start && distance < b.end)) continue
    const region = fold.bends.filter((b) => distance >= b.end).length
    const side = component.layer === "bottom" ? -1 : 1
    const key = `${region}:${side}`
    const panel = panels.get(key) ?? {
      count: 0,
      sum: new THREE.Vector3(),
      side,
    }
    panel.count++
    panel.sum.add(point)
    panels.set(key, panel)
  }
  // Preserve the authored frame for a tie rather than depending on array order.
  const ranked = [...panels.values()].sort((a, b) => b.count - a.count)
  const primary = ranked[0]
  if (!primary || ranked[1]?.count === primary.count) return identity
  const anchor = primary.sum.clone().divideScalar(primary.count)
  const normal = fold.direction({ x: 0, y: 0, z: primary.side }, anchor)
  const zAxis = new THREE.Vector3(normal.x, normal.y, normal.z).normalize()
  if (zAxis.distanceToSquared(new THREE.Vector3(0, 0, 1)) < 1e-12)
    return identity
  const tangent = fold.direction({ x: 1, y: 0, z: 0 }, anchor)
  const xAxis = new THREE.Vector3(tangent.x, tangent.y, tangent.z).normalize()
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize()
  const matrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis).invert()
  const foldedAnchor = fold.point(anchor)
  const center = new THREE.Vector3(
    foldedAnchor.x + board.center.x,
    foldedAnchor.y + board.center.y,
    foldedAnchor.z,
  ).applyMatrix4(matrix)
  matrix.setPosition(center.negate())
  return matrix
}

/** Fit camera and orbit controls to the same frame as the displayed meshes. */
export function transformPresentationBounds(
  bounds: Bounds3d | undefined,
  presentation: THREE.Matrix4,
): Bounds3d | undefined {
  if (!bounds) return undefined
  const box = new THREE.Box3(
    new THREE.Vector3(bounds.minX, bounds.minY, bounds.minZ),
    new THREE.Vector3(bounds.maxX, bounds.maxY, bounds.maxZ),
  ).applyMatrix4(presentation)
  return {
    minX: box.min.x,
    maxX: box.max.x,
    minY: box.min.y,
    maxY: box.max.y,
    minZ: box.min.z,
    maxZ: box.max.z,
  }
}
