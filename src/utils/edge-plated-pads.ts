import { colorize } from "@jscad/modeling/src/colors"
import type { Geom2, Geom3 } from "@jscad/modeling/src/geometries/types"
import { measureArea } from "@jscad/modeling/src/measurements"
import {
  intersect as jscadIntersect,
  subtract as jscadSubtract,
  union as jscadUnion,
} from "@jscad/modeling/src/operations/booleans"
import { expand as jscadExpand } from "@jscad/modeling/src/operations/expansions"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { polygon as jscadPolygon } from "@jscad/modeling/src/primitives"
import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard, PcbSmtPad } from "circuit-json"
import type { ManifoldToplevel } from "manifold-3d"
import {
  colors as defaultColors,
  M,
  SMOOTH_CIRCLE_SEGMENTS,
} from "../geoms/constants"
import {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "./rect-border-radius"

const EDGE_PLATING_RADIAL_DEPTH = 0.035
const EDGE_PLATING_SUBTRACT_OUTSET = 0.02
const EDGE_PLATING_Z_INSET = 0.001
const EDGE_TOUCH_TOLERANCE = 1e-3
const COORD_EPS = 1e-7

type Vec2Tuple = [number, number]

const cleanCcwPolygonPoints = (rawPoints: Vec2Tuple[]): Vec2Tuple[] | null => {
  const deduped: Vec2Tuple[] = []
  for (const pt of rawPoints) {
    if (!Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue
    const prev = deduped[deduped.length - 1]
    if (
      prev &&
      Math.abs(prev[0] - pt[0]) <= COORD_EPS &&
      Math.abs(prev[1] - pt[1]) <= COORD_EPS
    ) {
      continue
    }
    deduped.push([pt[0], pt[1]])
  }
  while (
    deduped.length > 1 &&
    Math.abs(deduped[0]![0] - deduped[deduped.length - 1]![0]) <= COORD_EPS &&
    Math.abs(deduped[0]![1] - deduped[deduped.length - 1]![1]) <= COORD_EPS
  ) {
    deduped.pop()
  }
  if (deduped.length < 3) return null

  let twiceArea = 0
  for (let i = 0; i < deduped.length; i++) {
    const a = deduped[i]!
    const b = deduped[(i + 1) % deduped.length]!
    twiceArea += a[0] * b[1] - b[0] * a[1]
  }
  if (Math.abs(twiceArea) <= 1e-10) return null

  return twiceArea < 0 ? [...deduped].reverse() : deduped
}

export const getBoardPolygonPoints = (board: PcbBoard): Vec2Tuple[] | null => {
  if (board.pcb_board_id === "faux-board") return null

  if (Array.isArray(board.outline) && board.outline.length >= 3) {
    return cleanCcwPolygonPoints(board.outline.map((p) => [p.x, p.y]))
  }

  const width = board.width ?? 0
  const height = board.height ?? 0
  if (width <= 0 || height <= 0) return null

  const cx = board.center?.x ?? 0
  const cy = board.center?.y ?? 0
  const hw = width / 2
  const hh = height / 2
  return [
    [cx - hw, cy - hh],
    [cx + hw, cy - hh],
    [cx + hw, cy + hh],
    [cx - hw, cy + hh],
  ]
}

const rotateAndTranslatePoints = (
  localPoints: Vec2Tuple[],
  cx: number,
  cy: number,
  ccwRotationDegrees = 0,
): Vec2Tuple[] => {
  const rad = (ccwRotationDegrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return localPoints.map(([lx, ly]) => [
    cx + lx * cos - ly * sin,
    cy + lx * sin + ly * cos,
  ])
}

const createRoundedRectPoints = (
  width: number,
  height: number,
  borderRadius?: number | null,
): Vec2Tuple[] => {
  const r = clampRectBorderRadius(width, height, borderRadius)
  const hw = width / 2
  const hh = height / 2
  if (r <= 1e-6) {
    return [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ]
  }

  const cornerSegments = Math.max(8, Math.floor(SMOOTH_CIRCLE_SEGMENTS / 4))
  const corners: Array<{ cx: number; cy: number; startAngle: number }> = [
    { cx: hw - r, cy: hh - r, startAngle: 0 },
    { cx: -hw + r, cy: hh - r, startAngle: Math.PI / 2 },
    { cx: -hw + r, cy: -hh + r, startAngle: Math.PI },
    { cx: hw - r, cy: -hh + r, startAngle: (3 * Math.PI) / 2 },
  ]

  const pts: Vec2Tuple[] = []
  for (const corner of corners) {
    for (let i = 0; i <= cornerSegments; i++) {
      const angle = corner.startAngle + ((Math.PI / 2) * i) / cornerSegments
      pts.push([
        corner.cx + r * Math.cos(angle),
        corner.cy + r * Math.sin(angle),
      ])
    }
  }
  return pts
}

export const getPcbSmtPadPolygonPoints = (
  pad: PcbSmtPad,
): Vec2Tuple[] | null => {
  if (pad.layer !== "top" && pad.layer !== "bottom") return null

  if (pad.shape === "polygon") {
    if (!Array.isArray(pad.points) || pad.points.length < 3) return null
    return cleanCcwPolygonPoints(pad.points.map((p) => [p.x, p.y]))
  }

  if (pad.shape === "circle") {
    if (!(pad.radius > 0)) return null
    const pts: Vec2Tuple[] = []
    for (let i = 0; i < SMOOTH_CIRCLE_SEGMENTS; i++) {
      const theta = (2 * Math.PI * i) / SMOOTH_CIRCLE_SEGMENTS
      pts.push([
        pad.x + pad.radius * Math.cos(theta),
        pad.y + pad.radius * Math.sin(theta),
      ])
    }
    return cleanCcwPolygonPoints(pts)
  }

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    if (!(pad.width > 0) || !(pad.height > 0)) return null
    const rotation = pad.shape === "rotated_rect" ? (pad.ccw_rotation ?? 0) : 0
    const localPts = createRoundedRectPoints(
      pad.width,
      pad.height,
      extractRectBorderRadius(pad),
    )
    return cleanCcwPolygonPoints(
      rotateAndTranslatePoints(localPts, pad.x, pad.y, rotation),
    )
  }

  if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    if (!(pad.width > 0) || !(pad.height > 0)) return null
    const rotation = pad.shape === "rotated_pill" ? (pad.ccw_rotation ?? 0) : 0
    const radius = pad.radius ?? Math.min(pad.width, pad.height) / 2
    const localPts = createRoundedRectPoints(pad.width, pad.height, radius)
    return cleanCcwPolygonPoints(
      rotateAndTranslatePoints(localPts, pad.x, pad.y, rotation),
    )
  }

  return null
}

const computePolygonAabb = (pts: Vec2Tuple[]) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of pts) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

const mightPadCrossBoardBoundary = (
  padPts: Vec2Tuple[],
  board: PcbBoard,
  boardAabb: ReturnType<typeof computePolygonAabb>,
): boolean => {
  const padAabb = computePolygonAabb(padPts)
  // Disjoint from board AABB
  if (
    padAabb.maxX < boardAabb.minX + EDGE_TOUCH_TOLERANCE ||
    padAabb.minX > boardAabb.maxX - EDGE_TOUCH_TOLERANCE ||
    padAabb.maxY < boardAabb.minY + EDGE_TOUCH_TOLERANCE ||
    padAabb.minY > boardAabb.maxY - EDGE_TOUCH_TOLERANCE
  ) {
    return false
  }

  // Fast skip for rectangular boards when pad sits strictly inside the board AABB
  const hasCustomOutline =
    Array.isArray(board.outline) && board.outline.length >= 3
  if (
    !hasCustomOutline &&
    padAabb.minX > boardAabb.minX + EDGE_TOUCH_TOLERANCE &&
    padAabb.maxX < boardAabb.maxX - EDGE_TOUCH_TOLERANCE &&
    padAabb.minY > boardAabb.minY + EDGE_TOUCH_TOLERANCE &&
    padAabb.maxY < boardAabb.maxY - EDGE_TOUCH_TOLERANCE
  ) {
    return false
  }

  return true
}

export interface ProcessEdgePlatedPadsManifoldResult {
  edgePlatedCopperOp: any | null
  edgePlatedSubtractOp: any | null
}

/**
 * Generates 3D rim copper along the vertical side faces of each board where
 * `pcb_smtpad` elements reach or overhang the board outline.
 */
export function processEdgePlatedPadsForManifold({
  Manifold,
  CrossSection,
  circuitJson,
  boards,
  pcbThickness,
  manifoldInstancesForCleanup,
}: {
  Manifold: ManifoldToplevel["Manifold"]
  CrossSection: ManifoldToplevel["CrossSection"]
  circuitJson: AnyCircuitElement[]
  boards: PcbBoard[]
  pcbThickness: number
  manifoldInstancesForCleanup: any[]
}): ProcessEdgePlatedPadsManifoldResult {
  const smtPads = su(circuitJson).pcb_smtpad.list()
  if (smtPads.length === 0 || boards.length === 0) {
    return { edgePlatedCopperOp: null, edgePlatedSubtractOp: null }
  }

  const copperHeight = Math.max(pcbThickness - 2 * EDGE_PLATING_Z_INSET, M)
  const subtractHeight = pcbThickness + 2 * EDGE_PLATING_SUBTRACT_OUTSET

  const copperOps: any[] = []
  const subtractOps: any[] = []

  for (const board of boards) {
    const boardPts = getBoardPolygonPoints(board)
    if (!boardPts) continue
    const boardAabb = computePolygonAabb(boardPts)

    const pcbComponentBoardIds = new Map<string, string>()
    if (boards.length > 1) {
      for (const pcbComponent of su(circuitJson).pcb_component.list()) {
        const componentBoardId =
          pcbComponent.positioned_relative_to_pcb_board_id ??
          ("pcb_board_id" in pcbComponent &&
          typeof pcbComponent.pcb_board_id === "string"
            ? pcbComponent.pcb_board_id
            : undefined)
        if (componentBoardId) {
          pcbComponentBoardIds.set(
            pcbComponent.pcb_component_id,
            componentBoardId,
          )
        }
      }
    }

    const candidatePadPts: Vec2Tuple[][] = []
    for (const pad of smtPads) {
      const padBoardId =
        ("pcb_board_id" in pad && typeof pad.pcb_board_id === "string"
          ? pad.pcb_board_id
          : undefined) ??
        (pad.pcb_component_id
          ? pcbComponentBoardIds.get(pad.pcb_component_id)
          : undefined)
      if (
        boards.length > 1 &&
        padBoardId &&
        board.pcb_board_id &&
        padBoardId !== board.pcb_board_id
      ) {
        continue
      }
      const pts = getPcbSmtPadPolygonPoints(pad)
      if (!pts) continue
      if (!mightPadCrossBoardBoundary(pts, board, boardAabb)) continue
      candidatePadPts.push(pts)
    }

    if (candidatePadPts.length === 0) continue

    const boardCs = CrossSection.ofPolygons([boardPts])
    manifoldInstancesForCleanup.push(boardCs)

    const strictInteriorCs = boardCs.offset(-EDGE_TOUCH_TOLERANCE)
    manifoldInstancesForCleanup.push(strictInteriorCs)

    const edgePadCrossSections: any[] = []
    for (const pts of candidatePadPts) {
      const padCs = CrossSection.ofPolygons([pts])
      manifoldInstancesForCleanup.push(padCs)

      const outsideOrEdgeCs = padCs.subtract(strictInteriorCs)
      manifoldInstancesForCleanup.push(outsideOrEdgeCs)
      if (outsideOrEdgeCs.isEmpty()) continue

      const anchoredInsideCs = padCs.intersect(strictInteriorCs)
      manifoldInstancesForCleanup.push(anchoredInsideCs)
      if (anchoredInsideCs.isEmpty()) continue

      edgePadCrossSections.push(padCs)
    }

    if (edgePadCrossSections.length === 0) continue

    const unionedEdgePadsCs =
      edgePadCrossSections.length === 1
        ? edgePadCrossSections[0]
        : CrossSection.union(edgePadCrossSections)
    if (edgePadCrossSections.length > 1) {
      manifoldInstancesForCleanup.push(unionedEdgePadsCs)
    }

    const recessedInteriorCs = boardCs.offset(-EDGE_PLATING_RADIAL_DEPTH)
    manifoldInstancesForCleanup.push(recessedInteriorCs)

    const rimBandCs = boardCs.subtract(recessedInteriorCs)
    manifoldInstancesForCleanup.push(rimBandCs)

    const rimCopperCs = rimBandCs.intersect(unionedEdgePadsCs)
    manifoldInstancesForCleanup.push(rimCopperCs)
    if (rimCopperCs.isEmpty()) continue

    const outsetBoardCs = boardCs.offset(EDGE_PLATING_SUBTRACT_OUTSET)
    manifoldInstancesForCleanup.push(outsetBoardCs)
    const rimSubtractBandCs = outsetBoardCs.subtract(recessedInteriorCs)
    manifoldInstancesForCleanup.push(rimSubtractBandCs)
    const rimSubtractCs = rimSubtractBandCs.intersect(unionedEdgePadsCs)
    manifoldInstancesForCleanup.push(rimSubtractCs)

    const copperOp = Manifold.extrude(
      rimCopperCs,
      copperHeight,
      0,
      0,
      [1, 1],
      true,
    )
    manifoldInstancesForCleanup.push(copperOp)
    copperOps.push(copperOp)

    const subtractOp = Manifold.extrude(
      rimSubtractCs,
      subtractHeight,
      0,
      0,
      [1, 1],
      true,
    )
    manifoldInstancesForCleanup.push(subtractOp)
    subtractOps.push(subtractOp)
  }

  if (copperOps.length === 0) {
    return { edgePlatedCopperOp: null, edgePlatedSubtractOp: null }
  }

  const edgePlatedCopperOp =
    copperOps.length === 1 ? copperOps[0] : Manifold.union(copperOps)
  if (copperOps.length > 1) {
    manifoldInstancesForCleanup.push(edgePlatedCopperOp)
  }

  const edgePlatedSubtractOp =
    subtractOps.length === 1 ? subtractOps[0] : Manifold.union(subtractOps)
  if (subtractOps.length > 1) {
    manifoldInstancesForCleanup.push(edgePlatedSubtractOp)
  }

  return { edgePlatedCopperOp, edgePlatedSubtractOp }
}

/**
 * JSCAD counterpart to `processEdgePlatedPadsForManifold` for `BoardGeomBuilder`.
 */
export function processEdgePlatedPadsForJscad({
  circuitJson,
  board,
  pcbThickness,
}: {
  circuitJson: AnyCircuitElement[]
  board: PcbBoard
  pcbThickness: number
}): {
  edgePlatedCopperGeom: Geom3 | null
  edgePlatedSubtractGeom: Geom3 | null
} {
  const boardPts = getBoardPolygonPoints(board)
  if (!boardPts) {
    return { edgePlatedCopperGeom: null, edgePlatedSubtractGeom: null }
  }

  const smtPads = su(circuitJson).pcb_smtpad.list()
  if (smtPads.length === 0) {
    return { edgePlatedCopperGeom: null, edgePlatedSubtractGeom: null }
  }

  const boardAabb = computePolygonAabb(boardPts)
  const candidatePadPts: Vec2Tuple[][] = []
  for (const pad of smtPads) {
    const pts = getPcbSmtPadPolygonPoints(pad)
    if (!pts) continue
    if (!mightPadCrossBoardBoundary(pts, board, boardAabb)) continue
    candidatePadPts.push(pts)
  }

  if (candidatePadPts.length === 0) {
    return { edgePlatedCopperGeom: null, edgePlatedSubtractGeom: null }
  }

  const board2d: Geom2 = jscadPolygon({ points: boardPts })
  const strictInterior2d: Geom2 = jscadExpand(
    { delta: -EDGE_TOUCH_TOLERANCE, corners: "edge" },
    board2d,
  )

  const matchedPads2d: Geom2[] = []
  for (const pts of candidatePadPts) {
    const pad2d = jscadPolygon({ points: pts })
    if (measureArea(jscadSubtract(pad2d, strictInterior2d)) <= 1e-8) continue
    if (measureArea(jscadIntersect(pad2d, strictInterior2d)) <= 1e-8) continue
    matchedPads2d.push(pad2d)
  }

  if (matchedPads2d.length === 0) {
    return { edgePlatedCopperGeom: null, edgePlatedSubtractGeom: null }
  }

  const unionedPads2d =
    matchedPads2d.length === 1
      ? matchedPads2d[0]!
      : jscadUnion(...matchedPads2d)
  const recessedInterior2d = jscadExpand(
    { delta: -EDGE_PLATING_RADIAL_DEPTH, corners: "edge" },
    board2d,
  )
  const rimBand2d = jscadSubtract(board2d, recessedInterior2d)
  const rimCopper2d = jscadIntersect(rimBand2d, unionedPads2d)
  if (measureArea(rimCopper2d) <= 1e-8) {
    return { edgePlatedCopperGeom: null, edgePlatedSubtractGeom: null }
  }

  const outsetBoard2d = jscadExpand(
    { delta: EDGE_PLATING_SUBTRACT_OUTSET, corners: "edge" },
    board2d,
  )
  const rimSubtract2d = jscadIntersect(
    jscadSubtract(outsetBoard2d, recessedInterior2d),
    unionedPads2d,
  )

  const copperHeight = Math.max(pcbThickness - 2 * EDGE_PLATING_Z_INSET, M)
  const subtractHeight = pcbThickness + 2 * EDGE_PLATING_SUBTRACT_OUTSET

  const edgePlatedCopperGeom = colorize(
    defaultColors.copper,
    translate(
      [0, 0, -copperHeight / 2],
      extrudeLinear({ height: copperHeight }, rimCopper2d),
    ),
  )
  const edgePlatedSubtractGeom = translate(
    [0, 0, -subtractHeight / 2],
    extrudeLinear({ height: subtractHeight }, rimSubtract2d),
  )

  return { edgePlatedCopperGeom, edgePlatedSubtractGeom }
}
