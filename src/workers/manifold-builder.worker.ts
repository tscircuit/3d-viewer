/// <reference lib="webworker" />

import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import type {
  ManifoldToplevel,
  Mesh as ManifoldMesh,
} from "manifold-3d/manifold.d.ts"
import ManifoldModule from "manifold-3d"
import {
  compose,
  translate,
  rotate,
  applyToPoint,
  Matrix,
} from "transformation-matrix"
import { vectorText } from "@jscad/modeling/src/text"

import {
  boardMaterialColors,
  colors as defaultColors,
  tracesMaterialColors,
  TRACE_TEXTURE_RESOLUTION,
} from "../geoms/constants"
import { createManifoldBoard } from "../utils/manifold/create-manifold-board"
import { processCutoutsForManifold } from "../utils/manifold/process-cutouts"
import { processNonPlatedHolesForManifold } from "../utils/manifold/process-non-plated-holes"
import { processPlatedHolesForManifold } from "../utils/manifold/process-plated-holes"
import { processSmtPadsForManifold } from "../utils/manifold/process-smt-pads"
import { processViasForManifold } from "../utils/manifold/process-vias"
import { isWireRoutePoint } from "../utils/trace-texture"

function createTraceTextureForLayerInWorker({
  layer,
  circuitJson,
  boardData,
  traceColor,
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  traceColor: string
  traceTextureResolution: number
}): ImageBitmap | null {
  const pcbTraces = su(circuitJson).pcb_trace.list()
  const allPcbVias = su(circuitJson).pcb_via.list()
  const allPcbPlatedHoles = su(circuitJson).pcb_plated_hole.list()

  const tracesOnLayer = pcbTraces.filter((t) =>
    t.route.some((p) => isWireRoutePoint(p) && p.layer === layer),
  )
  if (tracesOnLayer.length === 0) return null

  const canvasWidth = Math.floor(boardData.width * traceTextureResolution)
  const canvasHeight = Math.floor(boardData.height * traceTextureResolution)
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  tracesOnLayer.forEach((trace) => {
    let firstPoint = true
    ctx.beginPath()
    ctx.strokeStyle = traceColor
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    let currentLineWidth = 0
    for (const point of trace.route) {
      if (!isWireRoutePoint(point) || point.layer !== layer) {
        if (!firstPoint) ctx.stroke()
        firstPoint = true
        continue
      }
      const pcbX = point.x
      const pcbY = point.y
      currentLineWidth = point.width * traceTextureResolution
      ctx.lineWidth = currentLineWidth
      const canvasX =
        (pcbX - boardData.center.x + boardData.width / 2) *
        traceTextureResolution
      const y_mult = layer === "top" ? 1 : -1
      const canvasY =
        (y_mult * (pcbY - boardData.center.y) + boardData.height / 2) *
        traceTextureResolution
      if (firstPoint) {
        ctx.moveTo(canvasX, canvasY)
        firstPoint = false
      } else {
        ctx.lineTo(canvasX, canvasY)
      }
    }
    if (!firstPoint) {
      ctx.stroke()
    }
  })

  ctx.globalCompositeOperation = "destination-out"
  ctx.fillStyle = "black"
  allPcbVias.forEach((via) => {
    const canvasX =
      (via.x - boardData.center.x + boardData.width / 2) *
      traceTextureResolution
    const canvasY =
      (-(via.y - boardData.center.y) + boardData.height / 2) *
      traceTextureResolution
    const canvasRadius = (via.outer_diameter / 2) * traceTextureResolution
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI, false)
    ctx.fill()
  })
  allPcbPlatedHoles.forEach((ph) => {
    if (ph.layers.includes(layer) && ph.shape === "circle") {
      const canvasX =
        (ph.x - boardData.center.x + boardData.width / 2) *
        traceTextureResolution
      const canvasY =
        (-(ph.y - boardData.center.y) + boardData.height / 2) *
        traceTextureResolution
      const canvasRadius = (ph.outer_diameter / 2) * traceTextureResolution
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI, false)
      ctx.fill()
    }
  })
  ctx.globalCompositeOperation = "source-over"
  return canvas.transferToImageBitmap()
}

function createSilkscreenTextureForLayerInWorker({
  layer,
  circuitJson,
  boardData,
  silkscreenColor = "rgb(255,255,255)",
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: any
  silkscreenColor?: string
  traceTextureResolution: number
}): ImageBitmap | null {
  const pcbSilkscreenTexts = su(circuitJson).pcb_silkscreen_text.list()
  const pcbSilkscreenPaths = su(circuitJson).pcb_silkscreen_path.list()

  const textsOnLayer = pcbSilkscreenTexts.filter((t) => t.layer === layer)
  const pathsOnLayer = pcbSilkscreenPaths.filter((p) => p.layer === layer)
  if (textsOnLayer.length === 0 && pathsOnLayer.length === 0) return null

  const canvasWidth = Math.floor(boardData.width * traceTextureResolution)
  const canvasHeight = Math.floor(boardData.height * traceTextureResolution)
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.strokeStyle = silkscreenColor
  ctx.fillStyle = silkscreenColor

  // Draw Silkscreen Paths
  pathsOnLayer.forEach((path: any) => {
    if (path.route.length < 2) return
    ctx.beginPath()
    ctx.lineWidth = (path.stroke_width || 0.1) * traceTextureResolution
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    path.route.forEach((point: any, index: number) => {
      const canvasX =
        (point.x - boardData.center.x + boardData.width / 2) *
        traceTextureResolution
      const y_mult = layer === "top" ? 1 : -1
      const canvasY =
        (y_mult * (point.y - boardData.center.y) + boardData.height / 2) *
        traceTextureResolution
      if (index === 0) ctx.moveTo(canvasX, canvasY)
      else ctx.lineTo(canvasX, canvasY)
    })
    ctx.stroke()
  })

  // Draw Silkscreen Text
  textsOnLayer.forEach((textS: any) => {
    const fontSize = textS.font_size || 0.25
    const textStrokeWidth =
      Math.min(Math.max(0.01, fontSize * 0.1), fontSize * 0.05) *
      traceTextureResolution
    ctx.lineWidth = textStrokeWidth
    ctx.lineCap = "butt"
    ctx.lineJoin = "miter"
    const rawTextOutlines = vectorText({
      height: fontSize * 0.45,
      input: textS.text,
    })
    const processedTextOutlines: Array<Array<[number, number]>> = []
    rawTextOutlines.forEach((outline: any) => {
      if (outline.length === 29) {
        processedTextOutlines.push(
          outline.slice(0, 15) as Array<[number, number]>,
        )
        processedTextOutlines.push(
          outline.slice(14, 29) as Array<[number, number]>,
        )
      } else if (outline.length === 17) {
        processedTextOutlines.push(
          outline.slice(0, 10) as Array<[number, number]>,
        )
        processedTextOutlines.push(
          outline.slice(9, 17) as Array<[number, number]>,
        )
      } else {
        processedTextOutlines.push(outline as Array<[number, number]>)
      }
    })
    const points = processedTextOutlines.flat()
    const textBounds = {
      minX: points.length > 0 ? Math.min(...points.map((p) => p[0])) : 0,
      maxX: points.length > 0 ? Math.max(...points.map((p) => p[0])) : 0,
      minY: points.length > 0 ? Math.min(...points.map((p) => p[1])) : 0,
      maxY: points.length > 0 ? Math.max(...points.map((p) => p[1])) : 0,
    }
    const textCenterX = (textBounds.minX + textBounds.maxX) / 2
    const textCenterY = (textBounds.minY + textBounds.maxY) / 2

    let xOff = -textCenterX
    let yOff = -textCenterY

    const alignment = textS.anchor_alignment || "center"

    // Horizontal alignment
    if (alignment.includes("left")) {
      xOff = -textBounds.minX
    } else if (alignment.includes("right")) {
      xOff = -textBounds.maxX
    }

    // Vertical alignment
    if (alignment.includes("top")) {
      yOff = -textBounds.maxY
    } else if (alignment.includes("bottom")) {
      yOff = -textBounds.minY
    }

    const transformMatrices: Matrix[] = []
    let rotationDeg = textS.ccw_rotation ?? 0
    if (textS.layer === "bottom") {
      transformMatrices.push(
        translate(textCenterX, textCenterY),
        { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 },
        translate(-textCenterX, -textCenterY),
      )
      rotationDeg = -rotationDeg
    } else if (layer === "top") {
      // For top layer, we are flipping the canvas, so we need to reverse rotation
      rotationDeg = -rotationDeg
    }
    if (rotationDeg) {
      const rad = (rotationDeg * Math.PI) / 180
      transformMatrices.push(
        translate(textCenterX, textCenterY),
        rotate(rad),
        translate(-textCenterX, -textCenterY),
      )
    }
    const finalTransformMatrix =
      transformMatrices.length > 0 ? compose(...transformMatrices) : undefined
    processedTextOutlines.forEach((segment) => {
      ctx.beginPath()
      segment.forEach((p, index) => {
        let transformedP = { x: p[0], y: p[1] }
        if (finalTransformMatrix) {
          transformedP = applyToPoint(finalTransformMatrix, transformedP)
        }
        const pcbX = transformedP.x + xOff + textS.anchor_position.x
        const pcbY = transformedP.y + yOff + textS.anchor_position.y
        const canvasX =
          (pcbX - boardData.center.x + boardData.width / 2) *
          traceTextureResolution
        const y_mult = layer === "top" ? 1 : -1
        const canvasY =
          (y_mult * (pcbY - boardData.center.y) + boardData.height / 2) *
          traceTextureResolution
        if (index === 0) ctx.moveTo(canvasX, canvasY)
        else ctx.lineTo(canvasX, canvasY)
      })
      ctx.stroke()
    })
  })
  return canvas.transferToImageBitmap()
}

// The main onmessage handler for the worker
self.onmessage = async (event) => {
  const { circuitJson, manifoldPath } = event.data

  try {
    const Manifold = (await ManifoldModule({
      locateFile: () => manifoldPath,
    })) as ManifoldToplevel
    Manifold.setup()

    const manifoldInstancesForCleanup: any[] = []

    const boards = su(circuitJson).pcb_board.list()
    if (boards.length === 0) {
      self.postMessage({
        type: "error",
        error: "No pcb_board found in circuitJson.",
      })
      return
    }
    const boardData = boards[0]!

    self.postMessage({ type: "log", message: "Manifold: Total Processing" })
    const currentPcbThickness = boardData.thickness || 1.6
    self.postMessage({ type: "pcb_thickness", payload: currentPcbThickness })
    self.postMessage({ type: "board_data", payload: boardData })

    // Step 1: Initial board shell
    self.postMessage({ type: "log", message: "Manifold: Board Shell" })
    let boardManifold = createManifoldBoard(
      Manifold.Manifold,
      Manifold.CrossSection,
      boardData,
      currentPcbThickness,
      manifoldInstancesForCleanup,
    )

    const matColorArray =
      boardMaterialColors[boardData.material] ?? defaultColors.fr4Green
    const boardColor = [matColorArray[0], matColorArray[1], matColorArray[2]]

    self.postMessage({
      type: "geom_update",
      payload: {
        board: {
          mesh: boardManifold.getMesh(),
          color: boardColor,
        },
      },
    })
    self.postMessage({ type: "log_end", message: "Manifold: Board Shell" })

    // Step 2: Holes and cutouts
    self.postMessage({ type: "log", message: "Manifold: Holes and Cutouts" })
    const allBoardDrills: any[] = []
    const { nonPlatedHoleBoardDrills } = processNonPlatedHolesForManifold(
      Manifold.Manifold,
      circuitJson,
      currentPcbThickness,
      manifoldInstancesForCleanup,
    )
    allBoardDrills.push(...nonPlatedHoleBoardDrills)

    const { platedHoleBoardDrills, platedHoleCopperGeoms } =
      processPlatedHolesForManifold(
        Manifold.Manifold,
        circuitJson,
        currentPcbThickness,
        manifoldInstancesForCleanup,
      )
    allBoardDrills.push(...platedHoleBoardDrills)

    const { viaBoardDrills, viaCopperGeoms } = processViasForManifold(
      Manifold.Manifold,
      circuitJson,
      currentPcbThickness,
      manifoldInstancesForCleanup,
    )
    allBoardDrills.push(...viaBoardDrills)

    if (allBoardDrills.length > 0) {
      const unionedDrills = Manifold.Manifold.union(allBoardDrills)
      manifoldInstancesForCleanup.push(unionedDrills)
      boardManifold = boardManifold.subtract(unionedDrills)
      manifoldInstancesForCleanup.push(boardManifold)
    }

    const { cutoutOps } = processCutoutsForManifold(
      Manifold.Manifold,
      Manifold.CrossSection,
      circuitJson,
      currentPcbThickness,
      manifoldInstancesForCleanup,
    )

    if (cutoutOps.length > 0) {
      const unionedCutouts = Manifold.Manifold.union(cutoutOps)
      manifoldInstancesForCleanup.push(unionedCutouts)
      boardManifold = boardManifold.subtract(unionedCutouts)
      manifoldInstancesForCleanup.push(boardManifold)
    }

    const serializablePlatedHoles = platedHoleCopperGeoms.map((g) => ({
      key: g.key,
      mesh: g.geometry,
      color: [g.color.r, g.color.g, g.color.b],
    }))
    const serializableVias = viaCopperGeoms.map((g) => ({
      key: g.key,
      mesh: g.geometry,
      color: [g.color.r, g.color.g, g.color.b],
    }))

    self.postMessage({
      type: "geom_update",
      payload: {
        board: {
          mesh: boardManifold.getMesh(),
          color: boardColor,
        },
        platedHoles: serializablePlatedHoles,
        vias: serializableVias,
      },
    })
    self.postMessage({
      type: "log_end",
      message: "Manifold: Holes and Cutouts",
    })

    // Step 3: SMT Pads
    self.postMessage({ type: "log", message: "Manifold: SMT Pads" })
    const { smtPadGeoms } = processSmtPadsForManifold(
      Manifold.Manifold,
      circuitJson,
      currentPcbThickness,
      manifoldInstancesForCleanup,
    )
    const serializableSmtPads = smtPadGeoms.map((g) => ({
      key: g.key,
      mesh: g.geometry,
      color: [g.color.r, g.color.g, g.color.b],
    }))
    self.postMessage({
      type: "geom_update",
      payload: {
        smtPads: serializableSmtPads,
      },
    })
    self.postMessage({ type: "log_end", message: "Manifold: SMT Pads" })

    // Step 4: Textures
    self.postMessage({ type: "log", message: "Manifold: Textures" })
    const traceColorArr =
      tracesMaterialColors[boardData.material] ??
      defaultColors.fr4GreenSolderWithMask
    const traceColor = `rgb(${Math.round(
      traceColorArr[0] * 255,
    )}, ${Math.round(traceColorArr[1] * 255)}, ${Math.round(
      traceColorArr[2] * 255,
    )})`

    const topTraceBitmap = createTraceTextureForLayerInWorker({
      layer: "top",
      circuitJson,
      boardData,
      traceColor,
      traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
    })
    if (topTraceBitmap) {
      self.postMessage(
        { type: "texture_update", payload: { topTrace: topTraceBitmap } },
        [topTraceBitmap],
      )
    }

    const bottomTraceBitmap = createTraceTextureForLayerInWorker({
      layer: "bottom",
      circuitJson,
      boardData,
      traceColor,
      traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
    })
    if (bottomTraceBitmap) {
      self.postMessage(
        { type: "texture_update", payload: { bottomTrace: bottomTraceBitmap } },
        [bottomTraceBitmap],
      )
    }

    const silkscreenColor = "rgb(255,255,255)" // White
    const topSilkscreenBitmap = createSilkscreenTextureForLayerInWorker({
      layer: "top",
      circuitJson,
      boardData,
      silkscreenColor,
      traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
    })
    if (topSilkscreenBitmap) {
      self.postMessage(
        {
          type: "texture_update",
          payload: { topSilkscreen: topSilkscreenBitmap },
        },
        [topSilkscreenBitmap],
      )
    }

    const bottomSilkscreenBitmap = createSilkscreenTextureForLayerInWorker({
      layer: "bottom",
      circuitJson,
      boardData,
      silkscreenColor,
      traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
    })
    if (bottomSilkscreenBitmap) {
      self.postMessage(
        {
          type: "texture_update",
          payload: { bottomSilkscreen: bottomSilkscreenBitmap },
        },
        [bottomSilkscreenBitmap],
      )
    }
    self.postMessage({ type: "log_end", message: "Manifold: Textures" })

    self.postMessage({ type: "done" })
    self.postMessage({ type: "log_end", message: "Manifold: Total Processing" })

    manifoldInstancesForCleanup.forEach((inst) => inst.delete())
  } catch (e: any) {
    self.postMessage({
      type: "error",
      error: e.message || "An unknown error occurred in the worker.",
    })
  }
}
