import type {
  AnyCircuitElement,
  PcbBoard,
  PcbRenderLayer,
  PcbTraceRoutePointVia,
  PcbViaInput,
} from "circuit-json"
import { type CanvasContext, CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { OutlineBounds } from "../../utils/outline-bounds"

const FABRICATION_NOTE_COLOR = "rgb(255,243,204)"
const TRANSPARENT = "rgba(0,0,0,0)"

const isViaTented = (
  via: PcbViaInput | PcbTraceRoutePointVia,
  layer: "top" | "bottom",
  board: PcbBoard | undefined,
) => {
  const viaTenting = layer === "top" ? via.tented_on_top : via.tented_on_bottom
  const legacyTenting = "is_tented" in via ? via.is_tented : undefined
  const boardDefault =
    layer === "top"
      ? board?.default_via_tented_on_top
      : board?.default_via_tented_on_bottom
  return viaTenting ?? legacyTenting ?? boardDefault ?? false
}

export const isOpenSurfaceAperture = (
  element: AnyCircuitElement,
  layer: "top" | "bottom",
  board: PcbBoard | undefined,
  soldermaskVisible: boolean,
) => {
  if (element.type === "pcb_cutout") return true
  if (element.type === "pcb_via") {
    return !soldermaskVisible || !isViaTented(element, layer, board)
  }
  if (element.type === "pcb_hole" || element.type === "pcb_plated_hole") {
    return !soldermaskVisible || element.is_covered_with_solder_mask !== true
  }
  return false
}

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

export const drawSilkscreenLayer = ({
  ctx,
  layer,
  bounds,
  elements,
  circuitJson,
  silkscreenColor,
  soldermaskVisible,
}: {
  ctx: CanvasContext
  layer: "top" | "bottom"
  bounds: OutlineBounds
  elements: AnyCircuitElement[]
  circuitJson: AnyCircuitElement[]
  silkscreenColor: string
  soldermaskVisible: boolean
}) => {
  const renderLayer: PcbRenderLayer =
    layer === "top" ? "top_silkscreen" : "bottom_silkscreen"

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
        inner7: TRANSPARENT,
        inner8: TRANSPARENT,
      },
      copperPour: {
        top: TRANSPARENT,
        bottom: TRANSPARENT,
      },
      drill: TRANSPARENT,
      boardOutline: TRANSPARENT,
      substrate: TRANSPARENT,
      keepout: { top: TRANSPARENT, bottom: TRANSPARENT },
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
        top: silkscreenColor,
        bottom: silkscreenColor,
      },
      fabricationNote: FABRICATION_NOTE_COLOR,
    },
  })
  setDrawerBounds(drawer, bounds)
  drawer.drawElements(elements, {
    layers: [renderLayer],
    clipContextElements: circuitJson,
  })

  const apertureElements = circuitJson.flatMap(
    (element): AnyCircuitElement[] => {
      if (element.type === "pcb_trace") {
        const board = ctx.boardOwnerMap?.get(element.pcb_trace_id)
        const route = element.route.filter(
          (point) =>
            point.route_type === "via" &&
            (!soldermaskVisible || !isViaTented(point, layer, board)),
        )
        return route.length ? [{ ...element, route }] : []
      }

      const board =
        element.type === "pcb_via"
          ? ctx.boardOwnerMap?.get(element.pcb_via_id)
          : undefined
      return isOpenSurfaceAperture(element, layer, board, soldermaskVisible)
        ? [element]
        : []
    },
  )
  drawer.drawElements(apertureElements, {
    layers: [renderLayer],
    clipContextElements: circuitJson,
    clearDrillHoles: true,
  })
}
