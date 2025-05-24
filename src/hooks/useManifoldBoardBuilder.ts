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
import { createTraceTextureForLayer } from "../utils/trace-texture"
import { createSilkscreenTextureForLayer } from "../utils/silkscreen-texture"
import { createPadManifoldOp } from "../utils/pad-geoms"
import {
  createCircleHoleDrill,
  createPlatedHoleDrill,
} from "../utils/hole-geoms"
import { createViaCopper } from "../utils/via-geoms"

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
          const translatedDrill = createCircleHoleDrill({
            Manifold,
            x: hole.x,
            y: hole.y,
            diameter: hole.hole_diameter,
            thickness: currentPcbThickness,
            segments: SMOOTH_CIRCLE_SEGMENTS,
          })
          manifoldInstancesForCleanup.current.push(translatedDrill)
          allHoleDrills.push(translatedDrill)
        }
      })
      // Plated holes (board cut)
      pcbPlatedHoles.forEach((ph: PcbPlatedHole) => {
        if (ph.shape === "circle") {
          const translatedDrill = createPlatedHoleDrill({
            Manifold,
            x: ph.x,
            y: ph.y,
            outerDiameter: ph.outer_diameter,
            thickness: currentPcbThickness,
            zOffset: MANIFOLD_Z_OFFSET,
            segments: SMOOTH_CIRCLE_SEGMENTS,
          })
          manifoldInstancesForCleanup.current.push(translatedDrill)
          allHoleDrills.push(translatedDrill)
        }
      })
      // Vias (board cut)
      pcbVias.forEach((via: PcbVia) => {
        if (typeof via.outer_diameter === "number") {
          const translatedDrill = createPlatedHoleDrill({
            Manifold,
            x: via.x,
            y: via.y,
            outerDiameter: via.outer_diameter,
            thickness: currentPcbThickness,
            zOffset: MANIFOLD_Z_OFFSET,
            segments: SMOOTH_CIRCLE_SEGMENTS,
          })
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

        let padManifoldOp: any = createPadManifoldOp({
          Manifold,
          pad,
          padBaseThickness,
        })

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
          const translatedViaCopper = createViaCopper({
            Manifold,
            x: via.x,
            y: via.y,
            outerDiameter: via.outer_diameter,
            holeDiameter: via.hole_diameter,
            thickness: currentPcbThickness,
            zOffset: MANIFOLD_Z_OFFSET,
            segments: SMOOTH_CIRCLE_SEGMENTS,
          })
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
      setTopTraceTexture(
        createTraceTextureForLayer({
          layer: "top",
          pcbTraces,
          boardData,
          traceColor,
          traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
          allPcbVias,
          allPcbPlatedHoles,
        }),
      )
      setBottomTraceTexture(
        createTraceTextureForLayer({
          layer: "bottom",
          pcbTraces,
          boardData,
          traceColor,
          traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
          allPcbVias,
          allPcbPlatedHoles,
        }),
      )

      // --- Process Silkscreen (as Textures) ---
      const pcbSilkscreenTexts = su(circuitJson).pcb_silkscreen_text.list()
      const pcbSilkscreenPaths = su(circuitJson).pcb_silkscreen_path.list()
      const silkscreenColor = "rgb(255,255,255)" // White
      setTopSilkscreenTexture(
        createSilkscreenTextureForLayer({
          layer: "top",
          pcbSilkscreenTexts,
          pcbSilkscreenPaths,
          boardData,
          silkscreenColor,
          traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
        }),
      )
      setBottomSilkscreenTexture(
        createSilkscreenTextureForLayer({
          layer: "bottom",
          pcbSilkscreenTexts,
          pcbSilkscreenPaths,
          boardData,
          silkscreenColor,
          traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
        }),
      )

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
