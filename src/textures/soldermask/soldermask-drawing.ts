import type {
  AnyCircuitElement,
  PcbBoard,
  PcbCopperPour,
  PcbRenderLayer,
} from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import * as THREE from "three"
import { colors as defaultColors } from "../../geoms/constants"
import type { OutlineBounds } from "../../utils/outline-bounds"
import {
  compositeSoldermaskOverCopper,
  resolveBoardSoldermaskColor,
  soldermaskColorToCss,
} from "../../utils/soldermask-color"

const toRgb = (colorArr: number[]) => {
  const [r = 0, g = 0, b = 0] = colorArr
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
    b * 255,
  )})`
}

type SoldermaskPalette = {
  soldermask: string
  soldermaskOverCopper: string
  copper: string
  transparent: string
}

export const getSoldermaskPalette = (
  boardData: PcbBoard,
): SoldermaskPalette => {
  const soldermaskColor = resolveBoardSoldermaskColor(boardData)
  const copperColor = new THREE.Color().setRGB(
    defaultColors.copper[0],
    defaultColors.copper[1],
    defaultColors.copper[2],
    THREE.SRGBColorSpace,
  )
  const soldermask = soldermaskColorToCss(soldermaskColor)
  const soldermaskOverCopper = soldermaskColorToCss(
    compositeSoldermaskOverCopper(soldermaskColor, copperColor),
  )

  return {
    soldermask,
    // Use one 87.5%-opaque material over both surfaces. This canvas pipeline
    // pre-composites that material where copper sits underneath.
    soldermaskOverCopper,
    copper: toRgb(defaultColors.copper),
    transparent: "rgba(0,0,0,0)",
  }
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

export const drawSoldermaskLayer = ({
  ctx,
  layer,
  bounds,
  elements,
  boardData,
}: {
  ctx: CanvasRenderingContext2D
  layer: "top" | "bottom"
  bounds: OutlineBounds
  elements: AnyCircuitElement[]
  boardData: PcbBoard
}) => {
  const palette = getSoldermaskPalette(boardData)
  const copperRenderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.configure({
    colorOverrides: {
      copper: {
        top: palette.transparent,
        bottom: palette.transparent,
        inner1: palette.transparent,
        inner2: palette.transparent,
        inner3: palette.transparent,
        inner4: palette.transparent,
        inner5: palette.transparent,
        inner6: palette.transparent,
        inner7: palette.transparent,
        inner8: palette.transparent,
      },
      drill: palette.transparent,
      boardOutline: palette.transparent,
      substrate: palette.transparent,
      keepout: { top: palette.transparent, bottom: palette.transparent },
      fabricationNote: palette.transparent,
      silkscreen: { top: palette.transparent, bottom: palette.transparent },
      courtyard: { top: palette.transparent, bottom: palette.transparent },
      soldermask: { top: palette.soldermask, bottom: palette.soldermask },
      soldermaskWithCopperUnderneath: {
        top: palette.soldermaskOverCopper,
        bottom: palette.soldermaskOverCopper,
      },
      soldermaskOverCopper: {
        top: palette.soldermaskOverCopper,
        bottom: palette.soldermaskOverCopper,
      },
    },
  })
  setDrawerBounds(drawer, bounds)
  const elementsWithoutKeepouts = elements.filter(
    (element) => element.type !== "pcb_keepout",
  )

  // Let circuit-to-canvas handle board/panel soldermask composition internally.
  drawer.drawElements(elementsWithoutKeepouts, {
    layers: [copperRenderLayer],
    drawSoldermask: true,
    drawSoldermaskTop: layer === "top",
    drawSoldermaskBottom: layer === "bottom",
  })

  const uncoveredPours = elementsWithoutKeepouts.filter(
    (e): e is PcbCopperPour =>
      e.type === "pcb_copper_pour" &&
      e.layer === layer &&
      e.covered_with_solder_mask === false,
  )
  if (uncoveredPours.length > 0) {
    ctx.save()
    ctx.globalCompositeOperation = "destination-out"
    const cutoutDrawer = new CircuitToCanvasDrawer(ctx)
    cutoutDrawer.configure({
      colorOverrides: {
        copper: {
          top: palette.copper,
          bottom: palette.copper,
          inner1: palette.copper,
          inner2: palette.copper,
          inner3: palette.copper,
          inner4: palette.copper,
          inner5: palette.copper,
          inner6: palette.copper,
          inner7: palette.copper,
          inner8: palette.copper,
        },
      },
    })
    setDrawerBounds(cutoutDrawer, bounds)
    cutoutDrawer.drawElements(uncoveredPours, { layers: [copperRenderLayer] })
    ctx.restore()
  }
}
