import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import type { OutlineBounds } from "../../utils/outline-bounds"
import { coerceDimensionToMm, parseDimensionToMm } from "../../utils/units"

const FABRICATION_NOTE_COLOR = "rgb(255,243,204)"
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

const normalizeFabricationElement = (
  element: AnyCircuitElement,
): AnyCircuitElement => {
  if (element.type === "pcb_fabrication_note_rect") {
    return {
      ...element,
      width: parseDimensionToMm(element.width) ?? 0,
      height: parseDimensionToMm(element.height) ?? 0,
      stroke_width: coerceDimensionToMm(element.stroke_width, 0.1),
      corner_radius: parseDimensionToMm(element.corner_radius),
    }
  }

  if (element.type === "pcb_fabrication_note_path") {
    return {
      ...element,
      stroke_width: coerceDimensionToMm(element.stroke_width, 0.1),
    }
  }

  if (element.type === "pcb_fabrication_note_text") {
    return {
      ...element,
      font_size: coerceDimensionToMm(element.font_size, 1),
    }
  }

  if (element.type === "pcb_fabrication_note_dimension") {
    return {
      ...element,
      font_size: coerceDimensionToMm(element.font_size, 1),
      arrow_size: coerceDimensionToMm(element.arrow_size, 1),
      offset_distance: coerceDimensionToMm(element.offset_distance, 0),
    }
  }

  return element
}

export const drawFabricationNoteLayer = ({
  ctx,
  layer,
  bounds,
  elements,
}: {
  ctx: CanvasRenderingContext2D
  layer: "top" | "bottom"
  bounds: OutlineBounds
  elements: AnyCircuitElement[]
}) => {
  const renderLayer = `${layer}_fabrication_note` as PcbRenderLayer
  const normalizedElements = elements.map(normalizeFabricationElement)

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
      copperPour: {
        top: TRANSPARENT,
        bottom: TRANSPARENT,
      },
      drill: TRANSPARENT,
      boardOutline: TRANSPARENT,
      substrate: TRANSPARENT,
      keepout: TRANSPARENT,
      courtyard: {
        top: TRANSPARENT,
        bottom: TRANSPARENT,
      },
      soldermask: {
        top: TRANSPARENT,
        bottom: TRANSPARENT,
      },
      soldermaskWithCopperUnderneath: {
        top: TRANSPARENT,
        bottom: TRANSPARENT,
      },
      soldermaskOverCopper: {
        top: TRANSPARENT,
        bottom: TRANSPARENT,
      },
      silkscreen: {
        top: TRANSPARENT,
        bottom: TRANSPARENT,
      },
      fabricationNote: FABRICATION_NOTE_COLOR,
    },
  })
  setDrawerBounds(drawer, bounds)
  drawer.drawElements(normalizedElements, {
    layers: [renderLayer],
  })
}
