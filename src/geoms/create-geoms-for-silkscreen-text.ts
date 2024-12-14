import { vectorText } from "@jscad/modeling/src/text"
import { PcbSilkscreenText } from "circuit-json"

// Generate 2D text outlines
export function createSilkscreenTextGeoms(silkscreenText: PcbSilkscreenText) {
  // Generate 2D text outlines
  const textOutlines = vectorText({
    height: silkscreenText.font_size,
    input: silkscreenText.text,
  })
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

  // Adjust for specific alignments
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

  return { textOutlines, xOffset, yOffset }
}
