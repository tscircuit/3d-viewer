import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { OutlineBounds } from "../../utils/outline-bounds"

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

export const drawThroughHoleLayer = ({
  ctx,
  layer,
  bounds,
  elements,
  copperColor,
}: {
  ctx: CanvasRenderingContext2D
  layer: "top" | "bottom"
  bounds: OutlineBounds
  elements: AnyCircuitElement[]
  copperColor: string
}) => {
  const renderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"

  const transparent = "rgba(0,0,0,0)"
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.configure({
    colorOverrides: {
      copper: {
        top: copperColor,
        bottom: copperColor,
        inner1: copperColor,
        inner2: copperColor,
        inner3: copperColor,
        inner4: copperColor,
        inner5: copperColor,
        inner6: copperColor,
      },
      drill: transparent,
      boardOutline: transparent,
      substrate: transparent,
      keepout: transparent,
      fabricationNote: transparent,
      silkscreen: { top: transparent, bottom: transparent },
      courtyard: { top: transparent, bottom: transparent },
      soldermask: { top: transparent, bottom: transparent },
      soldermaskWithCopperUnderneath: {
        top: transparent,
        bottom: transparent,
      },
      soldermaskOverCopper: {
        top: transparent,
        bottom: transparent,
      },
    },
  })
  setDrawerBounds(drawer, bounds)
  drawer.drawElements(elements, {
    layers: [renderLayer],
  })
}
