import { useState, useEffect, useMemo, useRef } from "react"
import type {
  AnyCircuitElement,
  Point as CircuitPoint,
  PcbBoard,
  PcbHole,
  PcbPanel,
  PcbPlatedHole,
  PcbSilkscreenPath,
  PcbSilkscreenText,
  PcbSmtPad,
  PcbTrace,
  PcbVia,
} from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import * as THREE from "three"
import {
  boardMaterialColors,
  DEFAULT_SMT_PAD_THICKNESS,
  colors as defaultColors,
  MANIFOLD_Z_OFFSET,
  SMOOTH_CIRCLE_SEGMENTS,
  TRACE_TEXTURE_RESOLUTION,
  tracesMaterialColors,
  soldermaskColors,
} from "../geoms/constants"
import type { ManifoldToplevel } from "manifold-3d"
import { createManifoldBoard } from "../utils/manifold/create-manifold-board"
import { processCopperPoursForManifold } from "../utils/manifold/process-copper-pours"
import { processCutoutsForManifold } from "../utils/manifold/process-cutouts"
import { processNonPlatedHolesForManifold } from "../utils/manifold/process-non-plated-holes"
import { processPlatedHolesForManifold } from "../utils/manifold/process-plated-holes"
import { processSmtPadsForManifold } from "../utils/manifold/process-smt-pads"
import { processViasForManifold } from "../utils/manifold/process-vias"
import { manifoldMeshToThreeGeometry } from "../utils/manifold-mesh-to-three-geometry"
import { createSilkscreenTextureForLayer } from "../utils/silkscreen-texture"
import { createSoldermaskTextureForLayer } from "../utils/soldermask-texture"
import { createTraceTextureForLayer } from "../utils/trace-texture"
import { createCopperTextTextureForLayer } from "../utils/copper-text-texture"
import { createPanelOutlineTextureForLayer } from "../utils/panel-outline-texture"

export interface ManifoldGeoms {
  board?: {
    geometry: THREE.BufferGeometry
    color: THREE.Color
    material: PcbBoard["material"]
    isFaux?: boolean
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
  topTraceWithMask?: THREE.CanvasTexture | null
  bottomTraceWithMask?: THREE.CanvasTexture | null
  topSilkscreen?: THREE.CanvasTexture | null
  bottomSilkscreen?: THREE.CanvasTexture | null
  topSoldermask?: THREE.CanvasTexture | null
  bottomSoldermask?: THREE.CanvasTexture | null
  topCopperText?: THREE.CanvasTexture | null
  bottomCopperText?: THREE.CanvasTexture | null
  topPanelOutlines?: THREE.CanvasTexture | null
  bottomPanelOutlines?: THREE.CanvasTexture | null
}

interface UseManifoldBoardBuilderResult {
  geoms: ManifoldGeoms | null
  textures: ManifoldTextures | null
  pcbThickness: number | null
  error: string | null
  isLoading: boolean
  boardData: PcbBoard | null
  isFauxBoard: boolean
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
    // Check for panel first
    const panels = circuitJson.filter(
      (e) => e.type === "pcb_panel",
    ) as PcbPanel[]
    const boards = su(circuitJson).pcb_board.list()

    if (panels.length > 0) {
      // Use the panel as the board
      const panel = panels[0]!
      const firstBoardInPanel = boards.find(
        (b) => b.pcb_panel_id === panel.pcb_panel_id,
      )
      return {
        type: "pcb_board",
        pcb_board_id: panel.pcb_panel_id,
        center: panel.center,
        width: panel.width,
        height: panel.height,
        thickness: firstBoardInPanel?.thickness ?? 1.6,
        material: firstBoardInPanel?.material ?? "fr4",
        num_layers: firstBoardInPanel?.num_layers ?? 2,
      } as PcbBoard
    }

    // Skip boards that are inside a panel - only render the panel outline
    const boardsNotInPanel = boards.filter((b) => !b.pcb_panel_id)
    return boardsNotInPanel.length > 0 ? boardsNotInPanel[0]! : null
  }, [circuitJson])

  const isFauxBoard = useMemo(() => {
    const boards = su(circuitJson).pcb_board.list()
    // A faux board is one that was added during preprocessing
    // We can identify it by checking if it has the faux board ID
    return boards.length > 0 && boards[0]!.pcb_board_id === "faux-board"
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

    const safeDelete = (inst: any) => {
      if (!inst || typeof inst.delete !== "function") return
      try {
        inst.delete()
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message?.includes("Manifold instance already deleted")
        ) {
          console.warn("Failed to delete Manifold instance", error)
        }
      }
    }

    // Cleanup previous Manifold objects
    manifoldInstancesForCleanup.current.forEach(safeDelete)
    manifoldInstancesForCleanup.current = []

    let boardManifold: any = null
    const currentGeoms: ManifoldGeoms = {}
    const currentTextures: ManifoldTextures = {}

    try {
      const currentPcbThickness = boardData.thickness || 1.6
      setPcbThickness(currentPcbThickness)

      const { boardOp: initialBoardOp, outlineCrossSection } =
        createManifoldBoard(
          Manifold,
          CrossSection,
          boardData,
          currentPcbThickness,
          manifoldInstancesForCleanup.current,
        )
      let currentBoardOp = initialBoardOp

      const BOARD_CLIP_Z_MARGIN = 1
      const clipThickness = currentPcbThickness + 2 * BOARD_CLIP_Z_MARGIN
      let boardClipVolume: any | null = null

      const BOARD_CLIP_XY_OUTSET = 0.01

      if (outlineCrossSection) {
        let clipCrossSection = outlineCrossSection
        if (BOARD_CLIP_XY_OUTSET > 0) {
          const inflatedCrossSection =
            outlineCrossSection.offset(BOARD_CLIP_XY_OUTSET)
          manifoldInstancesForCleanup.current.push(inflatedCrossSection)
          clipCrossSection = inflatedCrossSection
        }

        const clipOp = Manifold.extrude(
          clipCrossSection,
          clipThickness,
          undefined,
          undefined,
          undefined,
          true,
        )
        manifoldInstancesForCleanup.current.push(clipOp)
        boardClipVolume = clipOp
      } else {
        const clipWidth = (boardData.width || 0) + 2 * BOARD_CLIP_XY_OUTSET
        const clipHeight = (boardData.height || 0) + 2 * BOARD_CLIP_XY_OUTSET
        const clipCube = Manifold.cube(
          [clipWidth, clipHeight, clipThickness],
          true,
        )
        manifoldInstancesForCleanup.current.push(clipCube)
        const translatedClipCube = clipCube.translate([
          boardData.center.x,
          boardData.center.y,
          0,
        ])
        manifoldInstancesForCleanup.current.push(translatedClipCube)
        boardClipVolume = translatedClipCube
      }

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
      const {
        platedHoleBoardDrills,
        platedHoleCopperGeoms,
        // NEW: bring in platedHoleSubtractOp
        platedHoleSubtractOp,
      } = processPlatedHolesForManifold(
        Manifold,
        CrossSection,
        circuitJson,
        currentPcbThickness,
        manifoldInstancesForCleanup.current,
        boardClipVolume,
      )
      allBoardDrills.push(...platedHoleBoardDrills)
      currentGeoms.platedHoles = platedHoleCopperGeoms

      // Process vias
      const { viaBoardDrills, viaCopperGeoms } = processViasForManifold(
        Manifold,
        circuitJson,
        currentPcbThickness,
        manifoldInstancesForCleanup.current,
        boardClipVolume,
      )
      allBoardDrills.push(...viaBoardDrills)
      currentGeoms.vias = viaCopperGeoms

      // Batch subtract all hole drills from the board
      if (allBoardDrills.length > 0) {
        holeUnion = Manifold.union(allBoardDrills)
        manifoldInstancesForCleanup.current.push(holeUnion)

        const totalSubtractionOps = platedHoleSubtractOp
          ? Manifold.union([holeUnion, platedHoleSubtractOp])
          : holeUnion
        manifoldInstancesForCleanup.current.push(totalSubtractionOps)

        const nextBoardAfterDrills =
          currentBoardOp.subtract(totalSubtractionOps)
        manifoldInstancesForCleanup.current.push(nextBoardAfterDrills)
        currentBoardOp = nextBoardAfterDrills
        if (platedHoleSubtractOp) {
          const cutPlatedCopper = platedHoleSubtractOp.subtract(holeUnion)
          manifoldInstancesForCleanup.current.push(cutPlatedCopper)
          const cutPlatedMesh = cutPlatedCopper.getMesh()
          const cutPlatedGeom = manifoldMeshToThreeGeometry(cutPlatedMesh)

          // Replace platedHoles array with a single unioned, already-cut geom
          currentGeoms.platedHoles = [
            {
              key: "plated-holes-union",
              geometry: cutPlatedGeom,
              color: new THREE.Color(
                defaultColors.copper[0],
                defaultColors.copper[1],
                defaultColors.copper[2],
              ),
            },
          ]
        }
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
        const matColorArray =
          boardMaterialColors[boardData.material] ?? defaultColors.fr4Tan
        currentGeoms.board = {
          geometry: finalBoardGeom,
          color: new THREE.Color(
            matColorArray[0],
            matColorArray[1],
            matColorArray[2],
          ),
          material: boardData.material,
          isFaux: isFauxBoard,
        }
      }

      // Process SMT pads
      const { smtPadGeoms } = processSmtPadsForManifold(
        Manifold,
        circuitJson,
        currentPcbThickness,
        manifoldInstancesForCleanup.current,
        holeUnion,
        boardClipVolume,
      )
      currentGeoms.smtPads = smtPadGeoms

      // Process copper pours
      const { copperPourGeoms } = processCopperPoursForManifold(
        Manifold,
        CrossSection,
        circuitJson,
        currentPcbThickness,
        manifoldInstancesForCleanup.current,
        boardData.material,
        holeUnion,
        boardClipVolume,
      )
      currentGeoms.copperPours = copperPourGeoms

      setGeoms(currentGeoms)

      // --- Process Traces (as Textures) ---
      // Create trace textures for when soldermask is OFF (tan/brown copper color)
      const traceColorWithoutMaskArr = defaultColors.fr4TracesWithoutMaskTan
      const traceColorWithoutMask = `rgb(${Math.round(traceColorWithoutMaskArr[0] * 255)}, ${Math.round(traceColorWithoutMaskArr[1] * 255)}, ${Math.round(traceColorWithoutMaskArr[2] * 255)})`
      currentTextures.topTrace = createTraceTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        traceColor: traceColorWithoutMask,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })
      currentTextures.bottomTrace = createTraceTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        traceColor: traceColorWithoutMask,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })

      // Create trace textures for when soldermask is ON (light green)
      const traceColorWithMaskArr = defaultColors.fr4TracesWithMaskGreen
      const traceColorWithMask = `rgb(${Math.round(traceColorWithMaskArr[0] * 255)}, ${Math.round(traceColorWithMaskArr[1] * 255)}, ${Math.round(traceColorWithMaskArr[2] * 255)})`
      currentTextures.topTraceWithMask = createTraceTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        traceColor: traceColorWithMask,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })
      currentTextures.bottomTraceWithMask = createTraceTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        traceColor: traceColorWithMask,
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

      // --- Process Soldermask (as Textures) ---
      const soldermaskColorArr =
        soldermaskColors[boardData.material] ?? defaultColors.fr4SolderMaskGreen
      const soldermaskColor = `rgb(${Math.round(soldermaskColorArr[0] * 255)}, ${Math.round(soldermaskColorArr[1] * 255)}, ${Math.round(soldermaskColorArr[2] * 255)})`
      currentTextures.topSoldermask = createSoldermaskTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        soldermaskColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })
      currentTextures.bottomSoldermask = createSoldermaskTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        soldermaskColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })

      // --- Process Copper Text (as Textures) ---
      const copperColorArr = defaultColors.copper
      const copperColor = `rgb(${Math.round(copperColorArr[0] * 255)}, ${Math.round(copperColorArr[1] * 255)}, ${Math.round(copperColorArr[2] * 255)})`
      currentTextures.topCopperText = createCopperTextTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        copperColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })
      currentTextures.bottomCopperText = createCopperTextTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        copperColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })

      // --- Process Panel Outlines (as Textures) ---
      currentTextures.topPanelOutlines = createPanelOutlineTextureForLayer({
        layer: "top",
        circuitJson,
        panelData: boardData,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      })
      currentTextures.bottomPanelOutlines = createPanelOutlineTextureForLayer({
        layer: "bottom",
        circuitJson,
        panelData: boardData,
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
      manifoldInstancesForCleanup.current.forEach(safeDelete)
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
    isFauxBoard,
  }
}
