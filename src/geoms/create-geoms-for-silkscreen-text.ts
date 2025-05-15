import { vectorText } from "@jscad/modeling/src/text"
import {
  compose,
  translate,
  rotate,
  applyToPoint,
  Matrix,
} from "transformation-matrix"
import { PcbSilkscreenText } from "circuit-json"

// Generate 2D text outlines
export function createSilkscreenTextGeoms(silkscreenText: PcbSilkscreenText) {
  const textOutlines = vectorText({
    height: silkscreenText.font_size * 0.57,
    input: silkscreenText.text,
  })

  let rotationDegrees = silkscreenText.ccw_rotation ?? 0

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

  if (silkscreenText.anchor_alignment?.includes("right")) {
    xOffset = -textBounds.maxX
  } else if (silkscreenText.anchor_alignment?.includes("left")) {
    xOffset = -textBounds.minX
  }

  if (silkscreenText.anchor_alignment?.includes("top")) {
    yOffset = -textBounds.maxY
  } else if (silkscreenText.anchor_alignment?.includes("bottom")) {
    yOffset = -textBounds.minY
  }

  // Compose transform: mirror if bottom layer, then apply rotation
  const transforms: Matrix[] = []

  // If bottom layer, mirror horizontally around center
  if (silkscreenText.layer === "bottom") {
    transforms.push(
      translate(centerX, centerY),
      { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 }, // horizontal flip matrix
      translate(-centerX, -centerY),
    )

    // Reverse the rotation direction for bottom layer
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
