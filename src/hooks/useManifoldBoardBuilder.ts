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
  PcbVia,
} from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import * as THREE from "three"
import type { BoardMaterialPhysicalProperties } from "../geoms/constants"
import {
  boardMaterialColors,
  boardMaterialPhysicalProperties,
  colors as defaultColors,
  tracesMaterialColors,
  MANIFOLD_Z_OFFSET,
  SMOOTH_CIRCLE_SEGMENTS,
  DEFAULT_SMT_PAD_THICKNESS,
  TRACE_TEXTURE_RESOLUTION,
} from "../geoms/constants"
import { manifoldMeshToThreeGeometry } from "../utils/manifold-mesh-to-three-geometry"
import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import { createTraceTextureForLayer } from "../utils/trace-texture"
import { createSilkscreenTextureForLayer } from "../utils/silkscreen-texture"
import { processNonPlatedHolesForManifold } from "../utils/manifold/process-non-plated-holes"
import { processPlatedHolesForManifold } from "../utils/manifold/process-plated-holes"
import { processViasForManifold } from "../utils/manifold/process-vias"
import { processSmtPadsForManifold } from "../utils/manifold/process-smt-pads"
import { createManifoldBoard } from "../utils/manifold/create-manifold-board"
import { processCopperPoursForManifold } from "../utils/manifold/process-copper-pours"
import { processCutoutsForManifold } from "../utils/manifold/process-cutouts"

export interface ManifoldGeoms {
  board?: {
    geometry: THREE.BufferGeometry
    color: THREE.Color
    materialProps: BoardMaterialPhysicalProperties
  }
  platedHoles?: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
  smtPads?: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
  vias?: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
  copperPours?: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
}

export interface ManifoldTextures {
  topTrace?: THREE.CanvasTexture | null
  bottomTrace?: THREE.CanvasTexture | null
  topSilkscreen?: THREE.CanvasTexture | null
  bottomSilkscreen?: THREE.CanvasTexture | null
}

interface UseManifoldBoardBuilderResult {
  geoms: ManifoldGeoms | null
  textures: ManifoldTextures | null
  pcbThickness: number | null
  error: string | null
  isLoading: boolean
  boardData: PcbBoard | null
}

export const useManifoldBoardBuilder = (
  manifoldJSModule: ManifoldToplevel | null,
  circuitJson: AnyCircuitElement[],
): UseManifoldBoardBuilderResult => {
  const [geoms, setGeoms] = useState<ManifoldGeoms | null>(null)
  const [textures, setTextures] = useState<ManifoldTextures | null>(null)
  const [pcbThickness, setPcbThickness] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const manifoldInstancesForCleanup = useRef<any[]>([])

  const boardData = useMemo(() => {
    const boards = su(circuitJson).pcb_board.list()
    if (boards.length === 0) {
      // Error will be set in effect
      return null
    }
    return boards[0]!
  }, [circuitJson])

  useEffect(() => {
    if (!manifoldJSModule || !boardData) {
      setGeoms(null)
      setTextures(null)
      setPcbThickness(null)
      setIsLoading(false)
      return
    }

    if (
      (boardData.width === 0 || !boardData.width) &&
      (boardData.height === 0 || !boardData.height) &&
      (!boardData.outline || boardData.outline.length < 3)
    ) {
      // This is an empty board, manifold can't handle it, but we can just
      // render nothing for the board and show the components.
      setGeoms({ platedHoles: [], smtPads: [], vias: [] })
      setTextures({})
      setPcbThickness(boardData.thickness ?? 0)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null) // Clear previous errors
    const Manifold = manifoldJSModule.Manifold
    const CrossSection = manifoldJSModule.CrossSection

    // Cleanup previous Manifold objects
    manifoldInstancesForCleanup.current.forEach((inst) => inst.delete())
    manifoldInstancesForCleanup.current = []

    let boardManifold: any = null
    const currentGeoms: ManifoldGeoms = {}
    const currentTextures: ManifoldTextures = {}

    try {
      const currentPcbThickness = boardData.thickness || 1.6
      setPcbThickness(currentPcbThickness)

      let currentBoardOp = createManifoldBoard(
        Manifold,
        CrossSection,
        boardData,
        currentPcbThickness,
        manifoldInstancesForCleanup.current,
      )

      // --- Batch Process All Holes (non-plated, plated, vias) ---
      const allBoardDrills: any[] = []
      let holeUnion: any | null = null

      // Process non-plated holes
      const { nonPlatedHoleBoardDrills } = processNonPlatedHolesForManifold(
        Manifold,
        circuitJson,
        currentPcbThickness,
        manifoldInstancesForCleanup.current,
      )
      allBoardDrills.push(...nonPlatedHoleBoardDrills)

      // Process plated holes
      const { platedHoleBoardDrills, platedHoleCopperGeoms } =
        processPlatedHolesForManifold(
          Manifold,
          circuitJson,
          currentPcbThickness,
          manifoldInstancesForCleanup.current,
        )
      allBoardDrills.push(...platedHoleBoardDrills)
      currentGeoms.platedHoles = platedHoleCopperGeoms

      // Process vias
      const { viaBoardDrills, viaCopperGeoms } = processViasForManifold(
        Manifold,
        circuitJson,
        currentPcbThickness,
        manifoldInstancesForCleanup.current,
      )
      allBoardDrills.push(...viaBoardDrills)
      currentGeoms.vias = viaCopperGeoms

      // Batch subtract all hole drills from the board
      if (allBoardDrills.length > 0) {
        holeUnion = Manifold.union(allBoardDrills)
        manifoldInstancesForCleanup.current.push(holeUnion)
        const nextBoardAfterDrills = currentBoardOp.subtract(holeUnion)
        manifoldInstancesForCleanup.current.push(nextBoardAfterDrills)
        currentBoardOp = nextBoardAfterDrills
      }

      const { cutoutOps } = processCutoutsForManifold(
        Manifold,
        CrossSection,
        circuitJson,
        currentPcbThickness,
        manifoldInstancesForCleanup.current,
      )

      if (cutoutOps.length > 0) {
        const unionedCutouts = Manifold.union(cutoutOps)
        manifoldInstancesForCleanup.current.push(unionedCutouts)
        const nextBoardAfterCutouts = currentBoardOp.subtract(unionedCutouts)
        manifoldInstancesForCleanup.current.push(nextBoardAfterCutouts)
        currentBoardOp = nextBoardAfterCutouts
      }

      boardManifold = currentBoardOp // Final board manifold

      if (boardManifold) {
        const boardThreeMesh = boardManifold.getMesh()
        const finalBoardGeom = manifoldMeshToThreeGeometry(boardThreeMesh)
        const materialKey = (boardData.material ??
          "fr4") as PcbBoard["material"]
        const materialProps =
          boardMaterialPhysicalProperties[materialKey] ??
          boardMaterialPhysicalProperties.fr4
        const matColorArray =
          boardMaterialColors[materialKey] ?? materialProps.baseColor
        currentGeoms.board = {
          geometry: finalBoardGeom,
          color: new THREE.Color(
            matColorArray[0],
            matColorArray[1],
            matColorArray[2],
          ),
          materialProps,
        }
      }

      // Process SMT pads
      const { smtPadGeoms } = processSmtPadsForManifold(
        Manifold,
        circuitJson,
        currentPcbThickness,
        manifoldInstancesForCleanup.current,
        holeUnion,
      )
      currentGeoms.smtPads = smtPadGeoms

      // Process copper pours
      const { copperPourGeoms } = processCopperPoursForManifold(
        Manifold,
        CrossSection,
        circuitJson,
        currentPcbThickness,
        manifoldInstancesForCleanup.current,
        holeUnion,
      )
      currentGeoms.copperPours = copperPourGeoms

      setGeoms(currentGeoms)

      // --- Process Traces (as Textures) ---
      const traceColorArr =
        tracesMaterialColors[boardData.material] ??
        defaultColors.fr4GreenSolderWithMask
      const traceColor = `rgb(${Math.round(traceColorArr[0] * 255)}, ${Math.round(traceColorArr[1] * 255)}, ${Math.round(traceColorArr[2] * 255)})`
      currentTextures.topTrace = createTraceTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        traceColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })
      currentTextures.bottomTrace = createTraceTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        traceColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })

      // --- Process Silkscreen (as Textures) ---
      const silkscreenColor = "rgb(255,255,255)" // White
      currentTextures.topSilkscreen = createSilkscreenTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        silkscreenColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })
      currentTextures.bottomSilkscreen = createSilkscreenTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        silkscreenColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })
      setTextures(currentTextures)
    } catch (e: any) {
      console.error("Error processing geometry with Manifold in hook:", e)
      setError(
        e.message ||
          "An unknown error occurred while processing geometry in hook.",
      )
      setGeoms(null)
      setTextures(null)
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
    geoms,
    textures,
    pcbThickness,
    error,
    isLoading,
    boardData,
  }
}
