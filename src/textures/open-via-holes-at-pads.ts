import type { AnyCircuitElement, PcbBoard, PcbVia } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import { getPcbVias } from "../utils/get-pcb-vias"
import { calculateOutlineBounds } from "../utils/outline-bounds"

/** A via that meets an exposed pad must remain a full through hole on both
 * surfaces, even when the rest of its annulus is tented. Draw the actual pad
 * shapes to handle rounded, rotated and polygon pads without bounding-box guesses. */
export function getViaHolesAtExposedPads(
  circuitJson: AnyCircuitElement[],
  boardData: PcbBoard,
  resolution: number,
): PcbVia[] {
  const vias = getPcbVias(circuitJson)
  if (!vias.length) return []
  const bounds = calculateOutlineBounds(boardData)
  const width = Math.floor(bounds.width * resolution)
  const height = Math.floor(bounds.height * resolution)
  if (width <= 0 || height <= 0) return []
  const opened = new Set<PcbVia>()
  for (const layer of ["top", "bottom"] as const) {
    const pads = circuitJson.filter(
      (element) =>
        ((element.type === "pcb_smtpad" && element.layer === layer) ||
          (element.type === "pcb_plated_hole" &&
            (!Array.isArray(element.layers) ||
              element.layers.includes(layer)))) &&
        element.is_covered_with_solder_mask !== true,
    )
    if (!pads.length) continue
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) continue
    const drawer = new CircuitToCanvasDrawer(ctx)
    drawer.configure({
      colorOverrides: {
        copper: {
          top: "white",
          bottom: "white",
          inner1: "white",
          inner2: "white",
          inner3: "white",
          inner4: "white",
          inner5: "white",
          inner6: "white",
          inner7: "white",
          inner8: "white",
        },
        drill: "rgba(0,0,0,0)",
      },
    })
    drawer.setCameraBounds(bounds)
    drawer.drawElements(pads, {
      layers: [layer === "top" ? "top_copper" : "bottom_copper"],
      drawSoldermask: false,
    })
    const pixels = ctx.getImageData(0, 0, width, height).data
    for (const via of vias) {
      if (opened.has(via) || !via.layers.includes(layer)) continue
      const radius = via.outer_diameter / 2
      const cx = ((via.x - bounds.minX) * width) / bounds.width
      const cy = ((bounds.maxY - via.y) * height) / bounds.height
      const rx = (radius * width) / bounds.width
      const ry = (radius * height) / bounds.height
      if (rx <= 0 || ry <= 0) continue
      const minX = Math.max(0, Math.floor(cx - rx)),
        maxX = Math.min(width - 1, Math.ceil(cx + rx))
      const minY = Math.max(0, Math.floor(cy - ry)),
        maxY = Math.min(height - 1, Math.ceil(cy + ry))
      let overlaps = false
      for (let y = minY; y <= maxY && !overlaps; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (
            ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 &&
            pixels[(y * width + x) * 4 + 3]! >= 128
          ) {
            overlaps = true
            break
          }
        }
      }
      if (overlaps) opened.add(via)
    }
  }
  return [...opened]
}

/** Erase only the physical drill, leaving the mask over surrounding copper.
 * Via centers are board-space points in mm (+Z up); canvas Y points down. */
export function clearViaHolesFromSurface({
  ctx,
  vias,
  boardData,
  layer,
  width,
  height,
}: {
  ctx: CanvasRenderingContext2D
  vias: PcbVia[]
  boardData: PcbBoard
  layer: "top" | "bottom"
  width: number
  height: number
}) {
  if (!vias.length) return
  const bounds = calculateOutlineBounds(boardData)
  ctx.save()
  ctx.globalCompositeOperation = "destination-out"
  ctx.fillStyle = "black"
  for (const via of vias) {
    if (!via.layers.includes(layer)) continue
    const x = ((via.x - bounds.minX) * width) / bounds.width
    const y =
      ((layer === "top" ? bounds.maxY - via.y : via.y - bounds.minY) * height) /
      bounds.height
    ctx.beginPath()
    ctx.ellipse(
      x,
      y,
      ((via.hole_diameter / 2) * width) / bounds.width,
      ((via.hole_diameter / 2) * height) / bounds.height,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.restore()
}
