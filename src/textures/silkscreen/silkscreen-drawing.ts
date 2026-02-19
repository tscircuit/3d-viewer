import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
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

export const drawSilkscreenLayer = ({
  ctx,
  layer,
  bounds,
  elements,
  silkscreenColor,
}: {
  ctx: CanvasRenderingContext2D
  layer: "top" | "bottom"
  bounds: OutlineBounds
  elements: AnyCircuitElement[]
  silkscreenColor: string
}) => {
  const drawer = new CircuitToCanvasDrawer(ctx)
  const silkscreenLayerName: PcbRenderLayer =
    layer === "top" ? "top_silkscreen" : "bottom_silkscreen"

  drawer.configure({
    colorOverrides: {
      silkscreen: {
        top: silkscreenColor,
        bottom: silkscreenColor,
      },
    },
  })

  setDrawerBounds(drawer, bounds)

  drawer.drawElements(elements, {
    drawSoldermask: false,
    drawBoardMaterial: false,
    layers: [silkscreenLayerName],
  })
}
