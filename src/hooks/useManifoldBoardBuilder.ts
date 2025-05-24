import { useState, useEffect, useMemo, useRef } from "react"
import type {
  AnyCircuitElement,
  PcbBoard,
  PcbPlatedHole,
  PcbSmtPad,
  PcbHole,
  PcbTrace,
  PcbSilkscreenText,
  PcbSilkscreenPath,
  Point as CircuitPoint,
} from "circuit-json"
import { su } from "@tscircuit/soup-util"
import * as THREE from "three"
import {
  boardMaterialColors,
  colors as defaultColors,
  tracesMaterialColors,
} from "../geoms/constants"
import { manifoldMeshToThreeGeometry } from "../utils/manifold-mesh-to-three-geometry"
import { vectorText } from "@jscad/modeling/src/text"
import {
  compose,
  translate,
  rotate,
  applyToPoint,
  Matrix,
} from "transformation-matrix"
import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import type { PcbVia } from "circuit-json"

const COPPER_COLOR = new THREE.Color(
  defaultColors.copper[0],
  defaultColors.copper[1],
  defaultColors.copper[2],
)
const DEFAULT_SMT_PAD_THICKNESS = 0.035 // Typical 1oz copper thickness in mm
const SMOOTH_CIRCLE_SEGMENTS = 32 // Number of segments for smooth circles
const MANIFOLD_Z_OFFSET = 0.001 // Small offset to prevent Z-fighting in Manifold viewer
const TRACE_TEXTURE_RESOLUTION = 50 // pixels per mm for trace texture (Increased from 20)

interface UseManifoldBoardBuilderResult {
  boardThreeGeom: THREE.BufferGeometry | null
  boardColor: THREE.Color
  otherComponentGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
  topTraceTexture: THREE.CanvasTexture | null
  bottomTraceTexture: THREE.CanvasTexture | null
  topSilkscreenTexture: THREE.CanvasTexture | null
  bottomSilkscreenTexture: THREE.CanvasTexture | null
  pcbThickness: number | null
  error: string | null
  isLoading: boolean
  boardData: PcbBoard | null
}

export const useManifoldBoardBuilder = (
  manifoldJSModule: ManifoldToplevel | null,
  circuitJson: AnyCircuitElement[] | undefined,
): UseManifoldBoardBuilderResult => {
  const [boardThreeGeom, setBoardThreeGeom] =
    useState<THREE.BufferGeometry | null>(null)
  const [boardColor, setBoardColor] = useState<THREE.Color>(
    new THREE.Color(
      defaultColors.fr4Green[0],
      defaultColors.fr4Green[1],
      defaultColors.fr4Green[2],
    ),
  )
  const [otherComponentGeoms, setOtherComponentGeoms] = useState<
    Array<{
      key: string
      geometry: THREE.BufferGeometry
      color: THREE.Color
    }>
  >([])
  const [topTraceTexture, setTopTraceTexture] =
    useState<THREE.CanvasTexture | null>(null)
  const [bottomTraceTexture, setBottomTraceTexture] =
    useState<THREE.CanvasTexture | null>(null)
  const [topSilkscreenTexture, setTopSilkscreenTexture] =
    useState<THREE.CanvasTexture | null>(null)
  const [bottomSilkscreenTexture, setBottomSilkscreenTexture] =
    useState<THREE.CanvasTexture | null>(null)
  const [pcbThickness, setPcbThickness] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Use 'any' for the cleanup array since Manifold does not export a specific instance type
  const manifoldInstancesForCleanup = useRef<any[]>([])

  const boardData = useMemo(() => {
    if (!circuitJson) return null
    const boards = su(circuitJson).pcb_board.list()
    if (boards.length === 0) {
      // Error will be set in effect
      return null
    }
    return boards[0]!
  }, [circuitJson])

  // Type guard for PcbHole with hole_diameter
  function isCircleHole(hole: any): hole is {
    x: number
    y: number
    hole_diameter: number
    hole_shape?: string
    shape?: string
  } {
    return (
      (hole.shape === "circle" || hole.hole_shape === "circle") &&
      typeof hole.hole_diameter === "number"
    )
  }
  // Type guard for trace route point with layer/width
  function isWireRoutePoint(
    point: any,
  ): point is { x: number; y: number; width: number; layer: string } {
    return (
      point &&
      point.route_type === "wire" &&
      typeof point.layer === "string" &&
      typeof point.width === "number"
    )
  }

  useEffect(() => {
    if (!manifoldJSModule || !circuitJson || !boardData) {
      setBoardThreeGeom(null)
      setOtherComponentGeoms([])
      setTopTraceTexture(null)
      setBottomTraceTexture(null)
      setTopSilkscreenTexture(null)
      setBottomSilkscreenTexture(null)
      setPcbThickness(null)
      if (circuitJson && su(circuitJson).pcb_board.list().length === 0) {
        setError("No pcb_board found in circuitJson.")
      }
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null) // Clear previous errors
    const Manifold = manifoldJSModule.Manifold

    // Cleanup previous Manifold objects
    manifoldInstancesForCleanup.current.forEach((inst) => inst.delete())
    manifoldInstancesForCleanup.current = []

    // Use 'any' for the Manifold instance variables
    let boardManifold: any = null
    const newOtherGeoms: Array<{
      key: string
      geometry: THREE.BufferGeometry
      color: THREE.Color
      manifoldSource: any
    }> = []

    try {
      const currentPcbThickness = boardData.thickness || 1.6
      setPcbThickness(currentPcbThickness)
      let currentBoardOp = Manifold.cube(
        [boardData.width, boardData.height, currentPcbThickness],
        true,
      )
      manifoldInstancesForCleanup.current.push(currentBoardOp)
      currentBoardOp = currentBoardOp.translate([
        boardData.center.x,
        boardData.center.y,
        0,
      ])

      // --- Batch Process All Holes (non-plated, plated, vias) ---
      const pcbHoles = su(circuitJson).pcb_hole.list()
      const pcbPlatedHoles = su(circuitJson).pcb_plated_hole.list()
      const pcbVias = su(circuitJson).pcb_via.list() as PcbVia[]
      const allHoleDrills: any[] = []
      // Non-plated holes
      pcbHoles.forEach((hole: PcbHole) => {
        if (isCircleHole(hole)) {
          const drill = Manifold.cylinder(
            currentPcbThickness * 1.2,
            hole.hole_diameter / 2,
            hole.hole_diameter / 2,
            SMOOTH_CIRCLE_SEGMENTS,
            true,
          )
          manifoldInstancesForCleanup.current.push(drill)
          const translatedDrill = drill.translate([hole.x, hole.y, 0])
          manifoldInstancesForCleanup.current.push(translatedDrill)
          allHoleDrills.push(translatedDrill)
        }
      })
      // Plated holes (board cut)
      pcbPlatedHoles.forEach((ph: PcbPlatedHole) => {
        if (ph.shape === "circle") {
          const boardHoleRadius = ph.outer_diameter / 2 + MANIFOLD_Z_OFFSET
          const drill = Manifold.cylinder(
            currentPcbThickness * 1.2,
            boardHoleRadius,
            boardHoleRadius,
            SMOOTH_CIRCLE_SEGMENTS,
            true,
          )
          manifoldInstancesForCleanup.current.push(drill)
          const translatedDrill = drill.translate([ph.x, ph.y, 0])
          manifoldInstancesForCleanup.current.push(translatedDrill)
          allHoleDrills.push(translatedDrill)
        }
      })
      // Vias (board cut)
      pcbVias.forEach((via: PcbVia) => {
        if (typeof via.outer_diameter === "number") {
          const boardHoleRadius = via.outer_diameter / 2 + MANIFOLD_Z_OFFSET
          const drill = Manifold.cylinder(
            currentPcbThickness * 1.2,
            boardHoleRadius,
            boardHoleRadius,
            SMOOTH_CIRCLE_SEGMENTS,
            true,
          )
          manifoldInstancesForCleanup.current.push(drill)
          const translatedDrill = drill.translate([via.x, via.y, 0])
          manifoldInstancesForCleanup.current.push(translatedDrill)
          allHoleDrills.push(translatedDrill)
        }
      })
      // Batch subtract all holes at once
      if (allHoleDrills.length > 0) {
        const unionedDrills = Manifold.union(allHoleDrills)
        manifoldInstancesForCleanup.current.push(unionedDrills)
        const nextBoard = currentBoardOp.subtract(unionedDrills)
        manifoldInstancesForCleanup.current.push(nextBoard)
        currentBoardOp = nextBoard
      }

      boardManifold = currentBoardOp // Final board manifold
      // Only call getMesh if boardManifold is not null
      if (boardManifold) {
        const boardThreeMesh = boardManifold.getMesh()
        const finalBoardGeom = manifoldMeshToThreeGeometry(boardThreeMesh)
        setBoardThreeGeom(finalBoardGeom)
      } else {
        setBoardThreeGeom(null)
      }

      const matColorArray =
        boardMaterialColors[boardData.material] ?? defaultColors.fr4Green
      setBoardColor(
        new THREE.Color(matColorArray[0], matColorArray[1], matColorArray[2]),
      )

      // --- Process Plated Holes (Copper part) ---
      pcbPlatedHoles.forEach((ph: PcbPlatedHole, index: number) => {
        if (ph.shape === "circle") {
          const copperPartThickness =
            currentPcbThickness + 2 * MANIFOLD_Z_OFFSET
          let platedPart = Manifold.cylinder(
            copperPartThickness,
            ph.outer_diameter / 2,
            -1,
            SMOOTH_CIRCLE_SEGMENTS,
            true,
          )
          manifoldInstancesForCleanup.current.push(platedPart)
          const drill = Manifold.cylinder(
            copperPartThickness * 1.05,
            ph.hole_diameter / 2,
            -1,
            SMOOTH_CIRCLE_SEGMENTS,
            true,
          )
          manifoldInstancesForCleanup.current.push(drill)
          const finalPlatedPartOp = platedPart.subtract(drill)
          manifoldInstancesForCleanup.current.push(finalPlatedPartOp)
          const translatedPlatedPart = finalPlatedPartOp.translate([
            ph.x,
            ph.y,
            0,
          ])
          manifoldInstancesForCleanup.current.push(translatedPlatedPart)
          const copperMesh = translatedPlatedPart.getMesh()
          const copperGeom = manifoldMeshToThreeGeometry(copperMesh)
          newOtherGeoms.push({
            key: `ph-${ph.pcb_plated_hole_id || index}`,
            geometry: copperGeom,
            color: COPPER_COLOR,
            manifoldSource: translatedPlatedPart,
          })
        }
      })

      // --- Process SMT Pads ---
      const smtPads = su(circuitJson).pcb_smtpad.list()
      smtPads.forEach((pad: PcbSmtPad, index: number) => {
        const padBaseThickness = DEFAULT_SMT_PAD_THICKNESS
        const zPos =
          pad.layer === "bottom"
            ? -currentPcbThickness / 2 -
              padBaseThickness / 2 -
              MANIFOLD_Z_OFFSET
            : currentPcbThickness / 2 + padBaseThickness / 2 + MANIFOLD_Z_OFFSET

        let padManifoldOp: any = null
        if (pad.shape === "rect") {
          padManifoldOp = Manifold.cube(
            [pad.width, pad.height, padBaseThickness],
            true,
          )
        } else if (pad.shape === "circle" && pad.radius) {
          padManifoldOp = Manifold.cylinder(
            padBaseThickness,
            pad.radius,
            -1,
            SMOOTH_CIRCLE_SEGMENTS,
            true,
          )
        }

        if (padManifoldOp) {
          manifoldInstancesForCleanup.current.push(padManifoldOp)
          const translatedPad = padManifoldOp.translate([pad.x, pad.y, zPos])
          manifoldInstancesForCleanup.current.push(translatedPad)

          const padMesh = translatedPad.getMesh()
          const padGeom = manifoldMeshToThreeGeometry(padMesh)

          newOtherGeoms.push({
            key: `pad-${pad.pcb_smtpad_id || index}`,
            geometry: padGeom,
            color: COPPER_COLOR,
            manifoldSource: translatedPad,
          })
        }
      })

      // --- Process PCB Vias (Copper part) ---
      pcbVias.forEach((via: PcbVia, index: number) => {
        if (
          typeof via.outer_diameter === "number" &&
          typeof via.hole_diameter === "number"
        ) {
          const copperPartThickness =
            currentPcbThickness + 2 * MANIFOLD_Z_OFFSET
          let viaCopper = Manifold.cylinder(
            copperPartThickness,
            via.outer_diameter / 2,
            -1,
            SMOOTH_CIRCLE_SEGMENTS,
            true,
          )
          manifoldInstancesForCleanup.current.push(viaCopper)
          const drill = Manifold.cylinder(
            copperPartThickness * 1.05,
            via.hole_diameter / 2,
            -1,
            SMOOTH_CIRCLE_SEGMENTS,
            true,
          )
          manifoldInstancesForCleanup.current.push(drill)
          const finalViaCopperOp = viaCopper.subtract(drill)
          manifoldInstancesForCleanup.current.push(finalViaCopperOp)
          const translatedViaCopper = finalViaCopperOp.translate([
            via.x,
            via.y,
            0,
          ])
          manifoldInstancesForCleanup.current.push(translatedViaCopper)
          const viaMesh = translatedViaCopper.getMesh()
          const viaGeom = manifoldMeshToThreeGeometry(viaMesh)
          newOtherGeoms.push({
            key: `via-${via.pcb_via_id || index}`,
            geometry: viaGeom,
            color: COPPER_COLOR,
            manifoldSource: translatedViaCopper,
          })
        }
      })

      // --- Process Traces (as Textures) ---
      const pcbTraces = su(circuitJson).pcb_trace.list()
      const traceColorArr =
        tracesMaterialColors[boardData.material] ??
        defaultColors.fr4GreenSolderWithMask
      const traceColor = `rgb(${Math.round(traceColorArr[0] * 255)}, ${Math.round(traceColorArr[1] * 255)}, ${Math.round(traceColorArr[2] * 255)})`
      const allPcbVias = su(circuitJson).pcb_via.list()
      const allPcbPlatedHoles = su(circuitJson).pcb_plated_hole.list()
      const createCanvasForLayer = (
        layer: "top" | "bottom",
      ): THREE.CanvasTexture | null => {
        const tracesOnLayer = pcbTraces.filter((t) =>
          t.route.some((p) => isWireRoutePoint(p) && p.layer === layer),
        )
        if (tracesOnLayer.length === 0) return null

        const canvas = document.createElement("canvas")
        const canvasWidth = Math.floor(
          boardData.width * TRACE_TEXTURE_RESOLUTION,
        )
        const canvasHeight = Math.floor(
          boardData.height * TRACE_TEXTURE_RESOLUTION,
        )
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) return null

        if (layer === "bottom") {
          // Apply a vertical flip for bottom layer canvas
          ctx.translate(0, canvasHeight)
          ctx.scale(1, -1)
        }

        tracesOnLayer.forEach((trace: PcbTrace) => {
          let firstPoint = true
          ctx.beginPath()
          ctx.strokeStyle = traceColor // Use the calculated trace color
          ctx.lineCap = "round"
          ctx.lineJoin = "round"

          let currentLineWidth = 0

          for (const point of trace.route) {
            if (!isWireRoutePoint(point) || point.layer !== layer) {
              if (!firstPoint) ctx.stroke() // Stroke the path so far
              firstPoint = true // Reset for a new path segment
              continue
            }

            const pcbX = point.x
            const pcbY = point.y
            currentLineWidth = point.width * TRACE_TEXTURE_RESOLUTION
            ctx.lineWidth = currentLineWidth

            // Convert PCB coordinates (center origin, Y up) to Canvas coordinates (top-left origin, Y down)
            const canvasX =
              (pcbX - boardData.center.x + boardData.width / 2) *
              TRACE_TEXTURE_RESOLUTION
            const canvasY =
              (-(pcbY - boardData.center.y) + boardData.height / 2) *
              TRACE_TEXTURE_RESOLUTION

            if (firstPoint) {
              ctx.moveTo(canvasX, canvasY)
              firstPoint = false
            } else {
              ctx.lineTo(canvasX, canvasY)
            }
          }
          if (!firstPoint) {
            // Ensure the last segment is drawn
            ctx.stroke()
          }
        })

        // Erase areas covered by via and plated hole pads
        ctx.globalCompositeOperation = "destination-out"
        ctx.fillStyle = "black" // Color doesn't matter with destination-out, but fill is needed

        allPcbVias.forEach((via) => {
          // Vias are typically through-hole, so their pads appear on both layers
          const canvasX =
            (via.x - boardData.center.x + boardData.width / 2) *
            TRACE_TEXTURE_RESOLUTION
          const canvasY =
            (-(via.y - boardData.center.y) + boardData.height / 2) *
            TRACE_TEXTURE_RESOLUTION
          const canvasRadius =
            (via.outer_diameter / 2) * TRACE_TEXTURE_RESOLUTION

          ctx.beginPath()
          ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI, false)
          ctx.fill()
        })

        allPcbPlatedHoles.forEach((ph) => {
          if (ph.layers.includes(layer) && ph.shape === "circle") {
            // Only erase if pad is on current layer and is circular
            const canvasX =
              (ph.x - boardData.center.x + boardData.width / 2) *
              TRACE_TEXTURE_RESOLUTION
            const canvasY =
              (-(ph.y - boardData.center.y) + boardData.height / 2) *
              TRACE_TEXTURE_RESOLUTION
            const canvasRadius =
              (ph.outer_diameter / 2) * TRACE_TEXTURE_RESOLUTION

            ctx.beginPath()
            ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI, false)
            ctx.fill()
          }
          // TODO: Could add support for pill-shaped plated hole pad cutouts if necessary
        })

        ctx.globalCompositeOperation = "source-over" // Restore default composite operation

        const texture = new THREE.CanvasTexture(canvas)
        texture.generateMipmaps = true
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.anisotropy = 16 // Or renderer.capabilities.getMaxAnisotropy() if renderer is accessible
        texture.needsUpdate = true
        return texture
      }
      setTopTraceTexture(createCanvasForLayer("top"))
      setBottomTraceTexture(createCanvasForLayer("bottom"))

      // --- Process Silkscreen (as Textures) ---
      const pcbSilkscreenTexts = su(circuitJson).pcb_silkscreen_text.list()
      const pcbSilkscreenPaths = su(circuitJson).pcb_silkscreen_path.list()
      const silkscreenColor = "rgb(255,255,255)" // White
      const createSilkscreenCanvasForLayer = (
        layer: "top" | "bottom",
      ): THREE.CanvasTexture | null => {
        const textsOnLayer = pcbSilkscreenTexts.filter((t) => t.layer === layer)
        const pathsOnLayer = pcbSilkscreenPaths.filter((p) => p.layer === layer)

        if (textsOnLayer.length === 0 && pathsOnLayer.length === 0) return null

        const canvas = document.createElement("canvas")
        const canvasWidth = Math.floor(
          boardData.width * TRACE_TEXTURE_RESOLUTION,
        )
        const canvasHeight = Math.floor(
          boardData.height * TRACE_TEXTURE_RESOLUTION,
        )
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) return null

        if (layer === "bottom") {
          // Apply a vertical flip for bottom layer canvas
          ctx.translate(0, canvasHeight)
          ctx.scale(1, -1)
        }

        ctx.strokeStyle = silkscreenColor
        ctx.fillStyle = silkscreenColor // For text fill, though we stroke vectorText output

        // Draw Silkscreen Paths
        pathsOnLayer.forEach((path: PcbSilkscreenPath) => {
          if (path.route.length < 2) return
          ctx.beginPath()
          ctx.lineWidth = (path.stroke_width || 0.1) * TRACE_TEXTURE_RESOLUTION
          ctx.lineCap = "round"
          ctx.lineJoin = "round"

          path.route.forEach((point, index) => {
            const canvasX =
              (point.x - boardData.center.x + boardData.width / 2) *
              TRACE_TEXTURE_RESOLUTION
            const canvasY =
              (-(point.y - boardData.center.y) + boardData.height / 2) *
              TRACE_TEXTURE_RESOLUTION
            if (index === 0) {
              ctx.moveTo(canvasX, canvasY)
            } else {
              ctx.lineTo(canvasX, canvasY)
            }
          })
          ctx.stroke()
        })

        // Draw Silkscreen Text
        textsOnLayer.forEach((textS: PcbSilkscreenText) => {
          const fontSize = textS.font_size || 0.25 // Default font size
          // Use a fraction of font_size for line width, similar to BoardGeomBuilder's expansionDelta
          const textStrokeWidth =
            Math.min(Math.max(0.01, fontSize * 0.1), fontSize * 0.05) *
            TRACE_TEXTURE_RESOLUTION
          ctx.lineWidth = textStrokeWidth
          ctx.lineCap = "butt" // Butt for text strokes often looks cleaner
          ctx.lineJoin = "miter"

          const rawTextOutlines = vectorText({
            height: fontSize * 0.57, // Matches createSilkscreenTextGeoms
            input: textS.text,
          })

          // Re-process textOutlines for '8' and 'e' if needed (logic from createSilkscreenTextGeoms)
          const processedTextOutlines: Array<Array<[number, number]>> = []
          rawTextOutlines.forEach((outline) => {
            if (outline.length === 29) {
              // '8'
              processedTextOutlines.push(
                outline.slice(0, 15) as Array<[number, number]>,
              )
              processedTextOutlines.push(
                outline.slice(14, 29) as Array<[number, number]>,
              )
            } else if (outline.length === 17) {
              // 'e'
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

          if (textS.anchor_alignment?.includes("right")) xOff = -textBounds.maxX
          else if (textS.anchor_alignment?.includes("left"))
            xOff = -textBounds.minX
          if (textS.anchor_alignment?.includes("top")) yOff = -textBounds.maxY
          else if (textS.anchor_alignment?.includes("bottom"))
            yOff = -textBounds.minY

          const transformMatrices: Matrix[] = []

          let rotationDeg = textS.ccw_rotation ?? 0
          if (textS.layer === "bottom") {
            // Apply horizontal flip to the text characters themselves for the bottom layer
            // This is done around the text's local center
            transformMatrices.push(
              translate(textCenterX, textCenterY),
              { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 }, // Horizontal flip matrix
              translate(-textCenterX, -textCenterY),
            )
            // Negate rotation angle for bottom layer to ensure correct orientation after all flips
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
            transformMatrices.length > 0
              ? compose(...transformMatrices)
              : undefined

          processedTextOutlines.forEach((segment) => {
            ctx.beginPath()
            segment.forEach((p, index) => {
              let transformedP = { x: p[0], y: p[1] }
              if (finalTransformMatrix) {
                transformedP = applyToPoint(finalTransformMatrix, transformedP)
              }

              // Add anchor position and alignment offset
              const pcbX = transformedP.x + xOff + textS.anchor_position.x
              const pcbY = transformedP.y + yOff + textS.anchor_position.y

              const canvasX =
                (pcbX - boardData.center.x + boardData.width / 2) *
                TRACE_TEXTURE_RESOLUTION
              const canvasY =
                (-(pcbY - boardData.center.y) + boardData.height / 2) *
                TRACE_TEXTURE_RESOLUTION

              if (index === 0) ctx.moveTo(canvasX, canvasY)
              else ctx.lineTo(canvasX, canvasY)
            })
            ctx.stroke()
          })
        })

        const texture = new THREE.CanvasTexture(canvas)
        texture.generateMipmaps = true
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.anisotropy = 16
        texture.needsUpdate = true
        return texture
      }

      setTopSilkscreenTexture(createSilkscreenCanvasForLayer("top"))
      setBottomSilkscreenTexture(createSilkscreenCanvasForLayer("bottom"))

      setOtherComponentGeoms(
        newOtherGeoms.map((g) => ({
          key: g.key,
          geometry: g.geometry,
          color: g.color,
        })),
      )
    } catch (e: any) {
      console.error("Error processing geometry with Manifold in hook:", e)
      setError(
        e.message ||
          "An unknown error occurred while processing geometry in hook.",
      )
      setBoardThreeGeom(null)
      setOtherComponentGeoms([])
      setTopTraceTexture(null)
      setBottomTraceTexture(null)
      setTopSilkscreenTexture(null)
      setBottomSilkscreenTexture(null)
    } finally {
      setIsLoading(false)
    }

    return () => {
      // Cleanup all Manifold instances created during this effect
      manifoldInstancesForCleanup.current.forEach((inst) => inst.delete())
      manifoldInstancesForCleanup.current = []
      // boardManifold is part of manifoldInstancesForCleanup if it was assigned
    }
  }, [manifoldJSModule, circuitJson, boardData])

  return {
    boardThreeGeom,
    boardColor,
    otherComponentGeoms,
    topTraceTexture,
    bottomTraceTexture,
    topSilkscreenTexture,
    bottomSilkscreenTexture,
    pcbThickness,
    error,
    isLoading,
    boardData,
  }
}
