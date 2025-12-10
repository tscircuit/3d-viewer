import { vectorText } from "@jscad/modeling/src/text"
import {
  compose,
  translate,
  rotate,
  applyToPoint,
  Matrix,
} from "transformation-matrix"

/**
 * Defines copper text on the PCB - local type definition
 * since this may not exist in circuit-json yet
 */
export interface PcbCopperText {
  type: "pcb_copper_text"
  pcb_copper_text_id: string
  pcb_group_id?: string
  subcircuit_id?: string
  font: "tscircuit2024"
  font_size: number | string
  pcb_component_id: string
  text: string
  is_knockout?: boolean
  knockout_padding?: {
    left: number | string
    top: number | string
    bottom: number | string
    right: number | string
  }
  ccw_rotation?: number
  layer: "top" | "bottom"
  is_mirrored?: boolean
  anchor_position: { x: number; y: number }
  anchor_alignment?: string
}

// Generate 2D text outlines for copper text
export function createCopperTextGeoms(copperText: PcbCopperText) {
  const fontSize =
    typeof copperText.font_size === "number" ? copperText.font_size : 0.2 // Default 0.2mm

  const textOutlines = vectorText({
    height: fontSize * 0.45,
    input: copperText.text,
  })

  let rotationDegrees = copperText.ccw_rotation ?? 0

  // Split number 8 and small e into two parts to fix visual issues
  textOutlines.forEach((outline) => {
    if (outline.length === 29) {
      textOutlines.splice(
        textOutlines.indexOf(outline),
        1,
        outline.slice(0, 15),
      )
      textOutlines.splice(
        textOutlines.indexOf(outline),
        0,
        outline.slice(14, 29),
      )
    } else if (outline.length === 17) {
      textOutlines.splice(
        textOutlines.indexOf(outline),
        1,
        outline.slice(0, 10),
      )
      textOutlines.splice(
        textOutlines.indexOf(outline),
        0,
        outline.slice(9, 17),
      )
    }
  })

  // Calculate text bounds and center point
  const points = textOutlines.flatMap((o) => o)
  const textBounds = {
    minX: Math.min(...points.map((p) => p[0])),
    maxX: Math.max(...points.map((p) => p[0])),
    minY: Math.min(...points.map((p) => p[1])),
    maxY: Math.max(...points.map((p) => p[1])),
  }
  const centerX = (textBounds.minX + textBounds.maxX) / 2
  const centerY = (textBounds.minY + textBounds.maxY) / 2

  // Calculate offset based on anchor alignment
  let xOffset = -centerX
  let yOffset = -centerY

  const anchorAlignment = copperText.anchor_alignment ?? "center"

  if (anchorAlignment.includes("right")) {
    xOffset = -textBounds.maxX
  } else if (anchorAlignment.includes("left")) {
    xOffset = -textBounds.minX
  }

  if (anchorAlignment.includes("top")) {
    yOffset = -textBounds.maxY
  } else if (anchorAlignment.includes("bottom")) {
    yOffset = -textBounds.minY
  }

  // Compose transform: mirror if bottom layer or is_mirrored, then apply rotation
  const transforms: Matrix[] = []

  // Handle mirroring:
  // - Bottom layer: auto-mirror unless is_mirrored is explicitly false
  // - Top layer: only mirror if is_mirrored is explicitly true
  const shouldMirror =
    copperText.layer === "bottom"
      ? copperText.is_mirrored !== false
      : copperText.is_mirrored === true

  if (shouldMirror) {
    transforms.push(
      translate(centerX, centerY),
      { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 }, // horizontal flip matrix
      translate(-centerX, -centerY),
    )

    // Reverse the rotation direction for mirrored text
    rotationDegrees = -rotationDegrees
  }

  // Apply rotation if rotation degrees are specified
  if (rotationDegrees) {
    const rad = (rotationDegrees * Math.PI) / 180
    transforms.push(
      translate(centerX, centerY),
      rotate(rad),
      translate(-centerX, -centerY),
    )
  }

  let transformedOutlines = textOutlines

  if (transforms.length > 0) {
    const matrix = compose(...transforms)
    transformedOutlines = textOutlines.map((outline) =>
      outline.map(([x, y]) => {
        const { x: nx, y: ny } = applyToPoint(matrix, { x, y })
        return [nx, ny]
      }),
    )
  }

  return {
    textOutlines: transformedOutlines,
    xOffset,
    yOffset,
  }
}
