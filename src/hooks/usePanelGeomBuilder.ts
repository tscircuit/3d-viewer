import { useState, useEffect, useMemo, useRef } from "react"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import * as THREE from "three"
import {
  boardMaterialColors,
  colors as defaultColors,
} from "../geoms/constants"
import { manifoldMeshToThreeGeometry } from "../utils/manifold-mesh-to-three-geometry"
import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import { createPanelGeometry } from "../utils/manifold/create-panel-geometry"

export interface PanelGeoms {
  panel?: {
    geometry: THREE.BufferGeometry
    color: THREE.Color
    material: PcbBoard["material"]
  }
}

interface UsePanelGeomBuilderResult {
  geoms: PanelGeoms | null
  pcbThickness: number | null
  error: string | null
  isLoading: boolean
  panelData: any | null
}

export const usePanelGeomBuilder = (
  manifoldJSModule: ManifoldToplevel | null,
  circuitJson: AnyCircuitElement[],
): UsePanelGeomBuilderResult => {
  const [geoms, setGeoms] = useState<PanelGeoms | null>(null)
  const [pcbThickness, setPcbThickness] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const manifoldInstancesForCleanup = useRef<any[]>([])

  const panelData = useMemo(() => {
    const panels = circuitJson.filter((e) => e.type === "pcb_panel")
    if (panels.length === 0) {
      return null
    }
    return panels[0] as any
  }, [circuitJson])

  const boards = useMemo(() => su(circuitJson).pcb_board.list(), [circuitJson])

  useEffect(() => {
    if (!manifoldJSModule || !panelData) {
      setGeoms(null)
      setPcbThickness(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
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

    const currentGeoms: PanelGeoms = {}

    try {
      // Use board thickness for panel (they're the same piece of material)
      const currentPcbThickness = boards[0]?.thickness || 1.6
      setPcbThickness(currentPcbThickness)

      // Create panel with board cutouts
      const { panelOp } = createPanelGeometry(
        Manifold,
        CrossSection,
        {
          width: panelData.width,
          height: panelData.height,
          center: panelData.center,
        },
        boards,
        currentPcbThickness,
        manifoldInstancesForCleanup.current,
      )

      if (panelOp) {
        const panelThreeMesh = panelOp.getMesh()
        const finalPanelGeom = manifoldMeshToThreeGeometry(panelThreeMesh)

        // Use same material/color as boards for visual continuity
        const boardMaterial = boards[0]?.material || "fr4"
        const matColorArray =
          boardMaterialColors[boardMaterial] ?? defaultColors.fr4Green
        currentGeoms.panel = {
          geometry: finalPanelGeom,
          color: new THREE.Color(
            matColorArray[0],
            matColorArray[1],
            matColorArray[2],
          ),
          material: boardMaterial,
        }
      }

      setGeoms(currentGeoms)
    } catch (e: any) {
      console.error("Error processing panel geometry with Manifold:", e)
      setError(
        e.message ||
          "An unknown error occurred while processing panel geometry.",
      )
      setGeoms(null)
    } finally {
      setIsLoading(false)
    }

    return () => {
      manifoldInstancesForCleanup.current.forEach(safeDelete)
      manifoldInstancesForCleanup.current = []
    }
  }, [manifoldJSModule, circuitJson, panelData, boards])

  return {
    geoms,
    pcbThickness,
    error,
    isLoading,
    panelData,
  }
}
