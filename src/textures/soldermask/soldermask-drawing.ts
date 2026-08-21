import type {
  AnyCircuitElement,
  PcbBoard,
  PcbCopperPour,
  PcbRenderLayer,
} from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import {
  colors as defaultColors,
  soldermaskColors,
} from "../../geoms/constants"
import type { OutlineBounds } from "../../utils/outline-bounds"

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

// Named PCB colors are intentionally less saturated than CSS colors. Real
// solder masks are translucent coatings over copper/FR4, not pure RGB ink.
const NAMED_SOLDER_MASK_COLORS: Record<
  string,
  { mask: string; maskOverCopper: string }
> = {
  green: { mask: "#0b5d3b", maskOverCopper: "#2f7a4f" },
  purple: { mask: "#56317d", maskOverCopper: "#77549a" },
  red: { mask: "#8f1f2d", maskOverCopper: "#b04b54" },
  yellow: { mask: "#b49a00", maskOverCopper: "#c9b633" },
  blue: { mask: "#145da0", maskOverCopper: "#3d7fb8" },
  white: { mask: "#d5d7db", maskOverCopper: "#e2b84a" },
  black: { mask: "#161b22", maskOverCopper: "#62666b" },
}

const getSoldermaskPalette = (
  material: PcbBoard["material"],
  solderMaskColor?: string,
): SoldermaskPalette => {
  const namedColor = solderMaskColor
    ? NAMED_SOLDER_MASK_COLORS[solderMaskColor.trim().toLowerCase()]
    : undefined
  const soldermask =
    namedColor?.mask ??
    solderMaskColor ??
    toRgb(soldermaskColors[material] ?? defaultColors.fr4SolderMaskGreen)
  const soldermaskOverCopper =
    namedColor?.maskOverCopper ??
    (material === "fr1"
      ? toRgb(defaultColors.fr1TracesWithMaskCopper)
      : toRgb(defaultColors.fr4TracesWithMaskGreen))

  return {
    soldermask,
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
  boardMaterial,
  solderMaskColor,
}: {
  ctx: CanvasRenderingContext2D
  layer: "top" | "bottom"
  bounds: OutlineBounds
  elements: AnyCircuitElement[]
  boardMaterial: PcbBoard["material"]
  solderMaskColor?: string
}) => {
  const palette = getSoldermaskPalette(boardMaterial, solderMaskColor)
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
