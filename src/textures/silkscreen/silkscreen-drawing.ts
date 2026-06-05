import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type {
  AnyCircuitElement,
  PcbRenderLayer,
  PcbSilkscreenText,
} from "circuit-json"
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
  silkscreenColor,
}: {
  ctx: CanvasRenderingContext2D
  layer: "top" | "bottom"
  bounds: OutlineBounds
  elements: AnyCircuitElement[]
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

  // Handle knockout silkscreen text using destination-out approach
  const knockoutTexts = elements.filter(
    (element): element is PcbSilkscreenText =>
      element.type === "pcb_silkscreen_text" && element.is_knockout === true,
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
      silkscreen: {
        top: "rgb(255,255,255)",
        bottom: "rgb(255,255,255)",
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
