import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { OutlineBounds } from "../utils/outline-bounds"

const TRANSPARENT = "rgba(0,0,0,0)"

const isOpenSurfaceAperture = (
  element: AnyCircuitElement,
  soldermaskVisible: boolean,
) => {
  if (element.type === "pcb_cutout") return true
  if (element.type === "pcb_via") {
    return !soldermaskVisible || element.is_tented !== true
  }
  if (element.type === "pcb_hole" || element.type === "pcb_plated_hole") {
    return !soldermaskVisible || element.is_covered_with_solder_mask !== true
  }
  return false
}

/**
 * Removes pixels that cannot exist on the physical board surface. This must be
 * done after all color layers are composited because later layers (notably
 * silkscreen) can otherwise paint over holes already opened by soldermask.
 */
export const clearPhysicalBoardApertures = ({
  ctx,
  circuitJson,
  bounds,
  layer,
  soldermaskVisible,
  width,
  height,
}: {
  ctx: CanvasRenderingContext2D
  circuitJson: AnyCircuitElement[]
  bounds: OutlineBounds
  layer: "top" | "bottom"
  soldermaskVisible: boolean
  width: number
  height: number
}) => {
  const apertures = circuitJson.filter((element) =>
    isOpenSurfaceAperture(element, soldermaskVisible),
  )
  if (apertures.length === 0) return

  const maskCanvas = document.createElement("canvas")
  maskCanvas.width = width
  maskCanvas.height = height
  const maskCtx = maskCanvas.getContext("2d")
  if (!maskCtx) return

  if (layer === "bottom") {
    maskCtx.translate(0, height)
    maskCtx.scale(1, -1)
  }

  const drawer = new CircuitToCanvasDrawer(maskCtx)
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
      drill: "#000",
    },
  })
  drawer.setCameraBounds({
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
  })

  const renderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"
  drawer.drawElements(apertures, {
    layers: [renderLayer],
    showPcbNotes: false,
  })

  ctx.save()
  ctx.globalCompositeOperation = "destination-out"
  ctx.drawImage(maskCanvas, 0, 0, width, height)
  ctx.restore()
}
