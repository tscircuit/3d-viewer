import type { AnyCircuitElement, PcbBoard, PcbPlatedHole } from "circuit-json"

type CastellatedOutlineVertex = {
  x: number
  y: number
  isCastellatedHole?: boolean
  is_castellated_hole?: boolean
  holeDiameter?: number | string
  hole_diameter?: number | string
  padDiameter?: number | string
  pad_diameter?: number | string
  outerDiameter?: number | string
  outer_diameter?: number | string
}

const parseMillimeters = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value
  }
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase()
    const numeric = Number.parseFloat(trimmed)
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined
    if (trimmed.endsWith("mil")) return numeric * 0.0254
    if (trimmed.endsWith("in")) return numeric * 25.4
    if (trimmed.endsWith("cm")) return numeric * 10
    return numeric
  }
  return undefined
}

/**
 * Materializes `PcbPlatedHole` elements for board outline vertices flagged with
 * `isCastellatedHole` / `is_castellated_hole` (from `@tscircuit/props`
 * `BoardOutlinePoint`), returning `circuitJson` unchanged by reference when no
 * castellated outline points are present.
 */
export function withCastellatedOutlinePlatedHoles(
  circuitJson: AnyCircuitElement[],
): AnyCircuitElement[] {
  const existingPlatedHoles = circuitJson.filter(
    (el): el is PcbPlatedHole => el.type === "pcb_plated_hole",
  )
  const synthesized: PcbPlatedHole[] = []

  for (const element of circuitJson) {
    if (element.type !== "pcb_board") continue
    const board = element as PcbBoard
    if (!Array.isArray(board.outline) || board.outline.length < 3) continue

    board.outline.forEach((rawVertex, vertexIndex) => {
      const vertex = rawVertex as CastellatedOutlineVertex
      if (!vertex?.isCastellatedHole && !vertex?.is_castellated_hole) return
      if (!Number.isFinite(vertex.x) || !Number.isFinite(vertex.y)) return

      const holeDiameter = parseMillimeters(
        vertex.holeDiameter ?? vertex.hole_diameter,
      )
      const outerDiameter = parseMillimeters(
        vertex.padDiameter ??
          vertex.pad_diameter ??
          vertex.outerDiameter ??
          vertex.outer_diameter,
      )
      if (!holeDiameter || !outerDiameter) return

      const resolvedOuter = Math.max(outerDiameter, holeDiameter)
      const alreadyExists =
        existingPlatedHoles.some(
          (ph) =>
            "x" in ph &&
            "y" in ph &&
            Math.abs(ph.x - vertex.x) <= 1e-4 &&
            Math.abs(ph.y - vertex.y) <= 1e-4,
        ) ||
        synthesized.some(
          (ph) =>
            "x" in ph &&
            "y" in ph &&
            Math.abs(ph.x - vertex.x) <= 1e-4 &&
            Math.abs(ph.y - vertex.y) <= 1e-4,
        )
      if (alreadyExists) return

      synthesized.push({
        type: "pcb_plated_hole",
        pcb_plated_hole_id: `castellated_${board.pcb_board_id}_${vertexIndex}`,
        pcb_board_id: board.pcb_board_id,
        shape: "circle",
        x: vertex.x,
        y: vertex.y,
        hole_diameter: holeDiameter,
        outer_diameter: resolvedOuter,
        layers: ["top", "bottom"],
      } as PcbPlatedHole)
    })
  }

  if (synthesized.length === 0) {
    return circuitJson
  }

  return [...circuitJson, ...synthesized]
}
