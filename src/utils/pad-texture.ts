// Utility for creating SMT pad textures for PCB layers

import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard, PcbRenderLayer } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import * as THREE from "three"
import { calculateOutlineBounds } from "./outline-bounds"
import {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "./rect-border-radius"

type PcbSmtPad = Extract<AnyCircuitElement, { type: "pcb_smtpad" }>
type BoardOutlineBounds = ReturnType<typeof calculateOutlineBounds>

export interface RoundedSmtPadDrawParams {
  centerX: number
  centerY: number
  width: number
  height: number
  radius: number
  rotationRadians: number
}

export function getRoundedSmtPadDrawParams({
  pad,
  boardOutlineBounds,
  canvasWidth,
  canvasHeight,
}: {
  pad: PcbSmtPad
  boardOutlineBounds: BoardOutlineBounds
  canvasWidth: number
  canvasHeight: number
}): RoundedSmtPadDrawParams | null {
  if (pad.shape !== "rect" && pad.shape !== "rotated_rect") return null

  const width = (pad as any).width
  const height = (pad as any).height
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    width <= 0 ||
    height <= 0
  ) {
    return null
  }

  const radius = clampRectBorderRadius(
    width,
    height,
    extractRectBorderRadius(pad),
  )
  if (radius <= 0) return null

  const pixelsPerXUnit = canvasWidth / boardOutlineBounds.width
  const pixelsPerYUnit = canvasHeight / boardOutlineBounds.height
  const pixelsPerUnit = Math.min(pixelsPerXUnit, pixelsPerYUnit)

  return {
    centerX:
      ((pad.x - boardOutlineBounds.minX) / boardOutlineBounds.width) *
      canvasWidth,
    centerY:
      canvasHeight -
      ((pad.y - boardOutlineBounds.minY) / boardOutlineBounds.height) *
        canvasHeight,
    width: width * pixelsPerXUnit,
    height: height * pixelsPerYUnit,
    radius: radius * pixelsPerUnit,
    rotationRadians:
      pad.shape === "rotated_rect"
        ? -(((pad as any).ccw_rotation ?? 0) * Math.PI) / 180
        : 0,
  }
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number,
) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const left = -halfWidth
  const right = halfWidth
  const top = -halfHeight
  const bottom = halfHeight

  ctx.beginPath()
  ctx.moveTo(left + radius, top)
  ctx.lineTo(right - radius, top)
  ctx.quadraticCurveTo(right, top, right, top + radius)
  ctx.lineTo(right, bottom - radius)
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom)
  ctx.lineTo(left + radius, bottom)
  ctx.quadraticCurveTo(left, bottom, left, bottom - radius)
  ctx.lineTo(left, top + radius)
  ctx.quadraticCurveTo(left, top, left + radius, top)
  ctx.closePath()
}

function drawRoundedSmtPad(
  ctx: CanvasRenderingContext2D,
  params: RoundedSmtPadDrawParams,
  copperColor: string,
) {
  ctx.save()
  ctx.translate(params.centerX, params.centerY)
  ctx.rotate(params.rotationRadians)
  ctx.fillStyle = copperColor
  drawRoundedRectPath(ctx, params.width, params.height, params.radius)
  ctx.fill()
  ctx.restore()
}

export function createPadTextureForLayer({
  layer,
  circuitJson,
  boardData,
  copperColor,
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  copperColor: string
  traceTextureResolution: number
}): THREE.CanvasTexture | null {
  const pcbSmtPads = su(circuitJson).pcb_smtpad.list()
  const smtPadsOnLayer = pcbSmtPads.filter((pad) => pad.layer === layer)
  if (smtPadsOnLayer.length === 0) return null
  const holes = su(circuitJson).pcb_hole.list()
  const platedHolesOnLayer = su(circuitJson)
    .pcb_plated_hole.list()
    .filter((e) => !Array.isArray(e.layers) || e.layers.includes(layer))
  const viasOnLayer = su(circuitJson)
    .pcb_via.list()
    .filter((e) => !Array.isArray(e.layers) || e.layers.includes(layer))
  const drillElements = [...holes, ...platedHolesOnLayer, ...viasOnLayer]

  const pcbRenderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"
  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const canvas = document.createElement("canvas")
  const canvasWidth = Math.floor(
    boardOutlineBounds.width * traceTextureResolution,
  )
  const canvasHeight = Math.floor(
    boardOutlineBounds.height * traceTextureResolution,
  )
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  if (layer === "bottom") {
    ctx.translate(0, canvasHeight)
    ctx.scale(1, -1)
  }

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
      copperPour: { top: transparent, bottom: transparent },
      drill: transparent,
      boardOutline: transparent,
      substrate: transparent,
      keepout: { top: transparent, bottom: transparent },
      fabricationNote: transparent,
      courtyard: { top: transparent, bottom: transparent },
      silkscreen: { top: transparent, bottom: transparent },
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
  drawer.setCameraBounds({
    minX: boardOutlineBounds.minX,
    maxX: boardOutlineBounds.maxX,
    minY: boardOutlineBounds.minY,
    maxY: boardOutlineBounds.maxY,
  })

  const roundedSmtPads = smtPadsOnLayer
    .map((pad) => ({
      pad,
      params: getRoundedSmtPadDrawParams({
        pad,
        boardOutlineBounds,
        canvasWidth,
        canvasHeight,
      }),
    }))
    .filter(
      (entry): entry is { pad: PcbSmtPad; params: RoundedSmtPadDrawParams } =>
        entry.params !== null,
    )
  const roundedSmtPadIds = new Set(
    roundedSmtPads.map(({ pad }) => pad.pcb_smtpad_id),
  )
  const roundedSmtPadDrawParams = roundedSmtPads.map(({ params }) => params)
  const rectangularSmtPads = smtPadsOnLayer.filter(
    (pad) => !roundedSmtPadIds.has(pad.pcb_smtpad_id),
  )

  drawer.drawElements([...rectangularSmtPads, ...drillElements], {
    layers: [pcbRenderLayer],
    drawSoldermask: false,
    drawSoldermaskTop: false,
    drawSoldermaskBottom: false,
  })

  for (const params of roundedSmtPadDrawParams) {
    drawRoundedSmtPad(ctx, params, copperColor)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
