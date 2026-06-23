import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { PCBKeepout, PcbRenderLayer } from "circuit-json"
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

export const drawKeepoutLayer = ({
  ctx,
  layer,
  bounds,
  elements,
  keepoutColor,
}: {
  ctx: CanvasRenderingContext2D
  layer: "top" | "bottom"
  bounds: OutlineBounds
  elements: PCBKeepout[]
  keepoutColor: string
}) => {
  const renderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.configure({
    colorOverrides: {
      keepout: {
        top: keepoutColor,
        bottom: keepoutColor,
      },
    },
  })
  setDrawerBounds(drawer, bounds)
  drawer.drawElements(elements, {
    layers: [renderLayer],
    drawSoldermask: false,
    drawSoldermaskTop: false,
    drawSoldermaskBottom: false,
  })
}
