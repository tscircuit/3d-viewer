import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { OutlineBounds } from "../../utils/outline-bounds"

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

export const drawSilkscreenLayer = ({
  ctx,
  layer,
  bounds,
  elements,
  apertureElements,
  silkscreenColor,
}: {
  ctx: CanvasRenderingContext2D
  layer: "top" | "bottom"
  bounds: OutlineBounds
  elements: AnyCircuitElement[]
  apertureElements: AnyCircuitElement[]
  silkscreenColor: string
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
  })

  if (apertureElements.length === 0) return

  const copperRenderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"
  drawer.configure({ colorOverrides: { drill: "#000" } })
  ctx.save()
  ctx.globalCompositeOperation = "destination-out"
  drawer.drawElements(apertureElements, {
    layers: [copperRenderLayer],
  })
  ctx.restore()
}
