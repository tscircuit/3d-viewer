import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type {
  AnyCircuitElement,
  PcbCopperText,
  PcbRenderLayer,
} from "circuit-json"
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

export const drawCopperTextLayer = ({
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
    },
  })
  setDrawerBounds(drawer, bounds)
  drawer.drawElements(elements, {
    layers: [renderLayer],
  })

  const knockoutTexts = elements.filter(
    (element): element is PcbCopperText =>
      element.type === "pcb_copper_text" && element.is_knockout === true,
  )
  if (knockoutTexts.length === 0) return

  const maskCanvas = document.createElement("canvas")
  maskCanvas.width = ctx.canvas.width
  maskCanvas.height = ctx.canvas.height
  const maskCtx = maskCanvas.getContext("2d")
  if (!maskCtx) return

  const knockoutCutoutDrawer = new CircuitToCanvasDrawer(maskCtx)
  knockoutCutoutDrawer.configure({
    colorOverrides: {
      copper: {
        top: "rgb(255,255,255)",
        bottom: "rgb(255,255,255)",
        inner1: "rgb(255,255,255)",
        inner2: "rgb(255,255,255)",
        inner3: "rgb(255,255,255)",
        inner4: "rgb(255,255,255)",
        inner5: "rgb(255,255,255)",
        inner6: "rgb(255,255,255)",
      },
    },
  })
  setDrawerBounds(knockoutCutoutDrawer, bounds)
  knockoutCutoutDrawer.drawElements(
    knockoutTexts.map((text) => ({
      ...text,
      is_knockout: false,
    })),
    {
      layers: [renderLayer],
    },
  )

  ctx.save()
  ctx.globalCompositeOperation = "destination-out"
  ctx.drawImage(maskCanvas, 0, 0)
  ctx.restore()
}
