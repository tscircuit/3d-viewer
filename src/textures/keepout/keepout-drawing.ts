import type { PCBKeepout, PcbRenderLayer } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { OutlineBounds } from "../../utils/outline-bounds"
import { coerceDimensionToMm } from "../../utils/units"

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

const normalizeKeepoutElement = (
  element: PCBKeepout,
  layer: "top" | "bottom",
): PCBKeepout => {
  const layers =
    Array.isArray(element.layers) && element.layers.length > 0
      ? element.layers
      : [layer]

  if (element.shape === "circle") {
    return {
      ...element,
      layers,
      center: {
        x: coerceDimensionToMm(element.center.x, 0),
        y: coerceDimensionToMm(element.center.y, 0),
      },
      radius: coerceDimensionToMm(element.radius, 0),
    }
  }

  if (element.shape === "rect") {
    return {
      ...element,
      layers,
      center: {
        x: coerceDimensionToMm(element.center.x, 0),
        y: coerceDimensionToMm(element.center.y, 0),
      },
      width: coerceDimensionToMm(element.width, 0),
      height: coerceDimensionToMm(element.height, 0),
    }
  }

  return {
    ...element,
    layers,
    outline: element.outline.map((point) => ({
      ...point,
      x: coerceDimensionToMm(point.x, 0),
      y: coerceDimensionToMm(point.y, 0),
    })),
  }
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
  const normalizedElements = elements.map((element) =>
    normalizeKeepoutElement(element, layer),
  )

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
  drawer.drawElements(normalizedElements, {
    layers: [renderLayer],
    drawSoldermask: false,
    drawSoldermaskTop: false,
    drawSoldermaskBottom: false,
  })
}
