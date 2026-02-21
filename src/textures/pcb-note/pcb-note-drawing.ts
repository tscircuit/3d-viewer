import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { AnyCircuitElement } from "circuit-json"
import type { OutlineBounds } from "../../utils/outline-bounds"
import { coerceDimensionToMm } from "../../utils/units"

const TRANSPARENT = "rgba(0,0,0,0)"

const setDrawerBounds = (
  drawer: CircuitToCanvasDrawer,
  bounds: OutlineBounds,
) => {
  drawer.setCameraBounds({
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
  })
}

const normalizePcbNoteElement = (
  element: AnyCircuitElement,
): AnyCircuitElement => {
  if (element.type === "pcb_note_line") {
    return {
      ...element,
      x1: coerceDimensionToMm(element.x1, 0),
      y1: coerceDimensionToMm(element.y1, 0),
      x2: coerceDimensionToMm(element.x2, 0),
      y2: coerceDimensionToMm(element.y2, 0),
      stroke_width: coerceDimensionToMm(element.stroke_width, 0.1),
    }
  }

  if (element.type === "pcb_note_rect") {
    return {
      ...element,
      center: {
        x: coerceDimensionToMm(element.center.x, 0),
        y: coerceDimensionToMm(element.center.y, 0),
      },
      width: coerceDimensionToMm(element.width, 0),
      height: coerceDimensionToMm(element.height, 0),
      stroke_width: coerceDimensionToMm(element.stroke_width, 0.1),
      corner_radius: coerceDimensionToMm(element.corner_radius, 0),
    }
  }

  if (element.type === "pcb_note_text") {
    return {
      ...element,
      anchor_position: {
        x: coerceDimensionToMm(element.anchor_position.x, 0),
        y: coerceDimensionToMm(element.anchor_position.y, 0),
      },
      font_size: coerceDimensionToMm(element.font_size, 1),
    }
  }

  if (element.type === "pcb_note_path") {
    return {
      ...element,
      route: element.route.map((point) => ({
        ...point,
        x: coerceDimensionToMm(point.x, 0),
        y: coerceDimensionToMm(point.y, 0),
      })),
      stroke_width: coerceDimensionToMm(element.stroke_width, 0.1),
    }
  }

  if (element.type === "pcb_note_dimension") {
    return {
      ...element,
      from: {
        x: coerceDimensionToMm(element.from.x, 0),
        y: coerceDimensionToMm(element.from.y, 0),
      },
      to: {
        x: coerceDimensionToMm(element.to.x, 0),
        y: coerceDimensionToMm(element.to.y, 0),
      },
      font_size: coerceDimensionToMm(element.font_size, 1),
      arrow_size: coerceDimensionToMm(element.arrow_size, 1),
      offset_distance: coerceDimensionToMm(element.offset_distance, 0),
    }
  }

  return element
}

export const drawPcbNoteLayer = ({
  ctx,
  bounds,
  elements,
}: {
  ctx: CanvasRenderingContext2D
  bounds: OutlineBounds
  elements: AnyCircuitElement[]
}) => {
  const normalizedElements = elements.map(normalizePcbNoteElement)
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.configure({
    colorOverrides: {
      copper: {
        top: TRANSPARENT,
        bottom: TRANSPARENT,
        inner1: TRANSPARENT,
        inner2: TRANSPARENT,
        inner3: TRANSPARENT,
        inner4: TRANSPARENT,
        inner5: TRANSPARENT,
        inner6: TRANSPARENT,
      },
      copperPour: { top: TRANSPARENT, bottom: TRANSPARENT },
      drill: TRANSPARENT,
      boardOutline: TRANSPARENT,
      substrate: TRANSPARENT,
      keepout: TRANSPARENT,
      courtyard: { top: TRANSPARENT, bottom: TRANSPARENT },
      soldermask: { top: TRANSPARENT, bottom: TRANSPARENT },
      soldermaskWithCopperUnderneath: {
        top: TRANSPARENT,
        bottom: TRANSPARENT,
      },
      soldermaskOverCopper: {
        top: TRANSPARENT,
        bottom: TRANSPARENT,
      },
      silkscreen: { top: TRANSPARENT, bottom: TRANSPARENT },
      fabricationNote: TRANSPARENT,
    },
  })
  setDrawerBounds(drawer, bounds)
  drawer.drawElements(normalizedElements)
}
