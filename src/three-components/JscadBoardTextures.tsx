import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"
import { useEffect, useMemo } from "react"
import { createCopperPourTextureForLayer } from "src/textures"
import * as THREE from "three"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import {
  BOARD_SURFACE_OFFSET,
  colors as defaultColors,
  FAUX_BOARD_OPACITY,
  soldermaskColors,
  TRACE_TEXTURE_RESOLUTION,
} from "../geoms/constants"
import { useThree } from "../react-three/ThreeContext"
import { createCopperTextTextureForLayer } from "../utils/copper-text-texture"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { createPanelOutlineTextureForLayer } from "../utils/panel-outline-texture"
import { createSilkscreenTextureForLayer } from "../utils/silkscreen-texture"
import { createSoldermaskTextureForLayer } from "../utils/soldermask-texture"
import { createTraceTextureForLayer } from "../utils/trace-texture"
import { getLayerTextureResolution } from "../utils/layer-texture-resolution"

interface JscadBoardTexturesProps {
  circuitJson: AnyCircuitElement[]
  pcbThickness: number
  isFaux?: boolean
}

export function JscadBoardTextures({
  circuitJson,
  pcbThickness,
  isFaux = false,
}: JscadBoardTexturesProps) {
  const { rootObject } = useThree()
  const { visibility } = useLayerVisibility()

  const boardData = useMemo(() => {
    // Check for panel first
    const panels = circuitJson.filter(
      (e): e is PcbPanel => e.type === "pcb_panel",
    )
    const boards = su(circuitJson).pcb_board.list()

    if (panels.length > 0) {
      // Use the panel as the board for texture sizing
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
        thickness: firstBoardInPanel?.thickness ?? 1.4,
        material: firstBoardInPanel?.material ?? "fr4",
        num_layers: firstBoardInPanel?.num_layers ?? 2,
      } as PcbBoard
    }

    // Skip boards that are inside a panel to avoid rendering them individually
    const boardsNotInPanel = boards.filter(
      (b): b is PcbBoard => !b.pcb_panel_id,
    )
    return boardsNotInPanel.length > 0 ? boardsNotInPanel[0]! : null
  }, [circuitJson])

  const traceTextureResolution = useMemo(() => {
    if (!boardData) return TRACE_TEXTURE_RESOLUTION
    return getLayerTextureResolution(boardData, TRACE_TEXTURE_RESOLUTION)
  }, [boardData])

  const textures = useMemo(() => {
    if (!boardData || !boardData.width || !boardData.height) return null

    // Soldermask color
    const soldermaskColorArr =
      soldermaskColors[boardData.material] ?? defaultColors.fr4SolderMaskGreen
    const soldermaskColor = `rgb(${Math.round(soldermaskColorArr[0] * 255)}, ${Math.round(soldermaskColorArr[1] * 255)}, ${Math.round(soldermaskColorArr[2] * 255)})`

    // Silkscreen color
    const silkscreenColor = "rgb(255,255,255)"

    // Trace color with mask (same as Manifold: fr4TracesWithMaskGreen)
    const traceColorWithMaskArr = defaultColors.fr4TracesWithMaskGreen
    const traceColorWithMask = `rgb(${Math.round(traceColorWithMaskArr[0] * 255)}, ${Math.round(traceColorWithMaskArr[1] * 255)}, ${Math.round(traceColorWithMaskArr[2] * 255)})`

    return {
      topSoldermask: createSoldermaskTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        soldermaskColor,
        traceTextureResolution,
      }),
      bottomSoldermask: createSoldermaskTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        soldermaskColor,
        traceTextureResolution,
      }),
      topSilkscreen: createSilkscreenTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        silkscreenColor,
        traceTextureResolution,
      }),
      bottomSilkscreen: createSilkscreenTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        silkscreenColor,
        traceTextureResolution,
      }),
      topTraceWithMask: createTraceTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        traceColor: traceColorWithMask,
        traceTextureResolution,
      }),
      bottomTraceWithMask: createTraceTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        traceColor: traceColorWithMask,
        traceTextureResolution,
      }),
      topCopperText: createCopperTextTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        copperColor: `rgb(${Math.round(defaultColors.copper[0] * 255)}, ${Math.round(defaultColors.copper[1] * 255)}, ${Math.round(defaultColors.copper[2] * 255)})`,
        traceTextureResolution,
      }),
      bottomCopperText: createCopperTextTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        copperColor: `rgb(${Math.round(defaultColors.copper[0] * 255)}, ${Math.round(defaultColors.copper[1] * 255)}, ${Math.round(defaultColors.copper[2] * 255)})`,
        traceTextureResolution,
      }),
      topPanelOutlines: createPanelOutlineTextureForLayer({
        layer: "top",
        circuitJson,
        panelData: boardData,
        traceTextureResolution,
      }),
      bottomPanelOutlines: createPanelOutlineTextureForLayer({
        layer: "bottom",
        circuitJson,
        panelData: boardData,
        traceTextureResolution,
      }),
      topCopper: createCopperPourTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        traceTextureResolution,
      }),
      bottomCopper: createCopperPourTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        traceTextureResolution,
      }),
    }
  }, [circuitJson, boardData, traceTextureResolution])

  useEffect(() => {
    if (!rootObject || !boardData || !textures) return

    const meshes: THREE.Mesh[] = []

    const createTexturePlane = (
      texture: THREE.CanvasTexture | null | undefined,
      zOffset: number,
      isBottomLayer: boolean,
      name: string,
      usePolygonOffset = false,
      depthWrite = false,
    ) => {
      if (!texture) return null

      // Use board outline bounds for plane geometry to match texture dimensions
      const boardOutlineBounds = calculateOutlineBounds(boardData)
      const planeGeom = new THREE.PlaneGeometry(
        boardOutlineBounds.width,
        boardOutlineBounds.height,
      )
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite,
        polygonOffset: usePolygonOffset,
        polygonOffsetUnits: usePolygonOffset ? -0.8 : 0,
        opacity: isFaux ? FAUX_BOARD_OPACITY : 1.0,
      })
      const mesh = new THREE.Mesh(planeGeom, material)
      mesh.position.set(
        boardOutlineBounds.centerX,
        boardOutlineBounds.centerY,
        zOffset,
      )
      if (isBottomLayer) {
        mesh.rotation.set(Math.PI, 0, 0)
      }
      mesh.name = name
      return mesh
    }

    // Small offset to place textures just above board surface (same as Manifold)
    const SURFACE_OFFSET = 0.001

    // Top soldermask (green layer on top of board) - use polygon offset to prevent z-fighting
    if (visibility.topMask) {
      const topSoldermaskMesh = createTexturePlane(
        textures.topSoldermask,
        pcbThickness / 2 + SURFACE_OFFSET,
        false,
        "jscad-top-soldermask",
        true,
      )
      if (topSoldermaskMesh) {
        meshes.push(topSoldermaskMesh)
        rootObject.add(topSoldermaskMesh)
      }
    }

    // Bottom soldermask
    if (visibility.bottomMask) {
      const bottomSoldermaskMesh = createTexturePlane(
        textures.bottomSoldermask,
        -pcbThickness / 2 - SURFACE_OFFSET,
        true,
        "jscad-bottom-soldermask",
        true,
      )
      if (bottomSoldermaskMesh) {
        meshes.push(bottomSoldermaskMesh)
        rootObject.add(bottomSoldermaskMesh)
      }
    }

    // Top trace with mask (visible traces through soldermask)
    // Place traces just above the 3D copper traces but still below pads.
    if (visibility.topCopper && visibility.topMask) {
      const topTraceWithMaskMesh = createTexturePlane(
        textures.topTraceWithMask,
        pcbThickness / 2 + BOARD_SURFACE_OFFSET.traces + 0.004,
        false,
        "jscad-top-trace-with-mask",
      )
      if (topTraceWithMaskMesh) {
        meshes.push(topTraceWithMaskMesh)
        rootObject.add(topTraceWithMaskMesh)
      }
    }

    // Bottom trace with mask - mirror ordering: board < copper traces < mask < pads
    if (visibility.bottomCopper && visibility.bottomMask) {
      const bottomTraceWithMaskMesh = createTexturePlane(
        textures.bottomTraceWithMask,
        -pcbThickness / 2 - BOARD_SURFACE_OFFSET.traces - 0.005,
        true,
        "jscad-bottom-trace-with-mask",
      )
      if (bottomTraceWithMaskMesh) {
        meshes.push(bottomTraceWithMaskMesh)
        rootObject.add(bottomTraceWithMaskMesh)
      }
    }

    // Top silkscreen
    if (visibility.topSilkscreen) {
      const topSilkscreenMesh = createTexturePlane(
        textures.topSilkscreen,
        pcbThickness / 2 + SURFACE_OFFSET + 0.002,
        false,
        "jscad-top-silkscreen",
      )
      if (topSilkscreenMesh) {
        meshes.push(topSilkscreenMesh)
        rootObject.add(topSilkscreenMesh)
      }
    }

    // Bottom silkscreen
    if (visibility.bottomSilkscreen) {
      const bottomSilkscreenMesh = createTexturePlane(
        textures.bottomSilkscreen,
        -pcbThickness / 2 - SURFACE_OFFSET - 0.002,
        true,
        "jscad-bottom-silkscreen",
      )
      if (bottomSilkscreenMesh) {
        meshes.push(bottomSilkscreenMesh)
        rootObject.add(bottomSilkscreenMesh)
      }
    }

    // Top copper text
    if (visibility.topCopper) {
      const topCopperTextMesh = createTexturePlane(
        textures.topCopperText,
        pcbThickness / 2 + BOARD_SURFACE_OFFSET.copper,
        false,
        "jscad-top-copper-text",
        true,
      )
      if (topCopperTextMesh) {
        meshes.push(topCopperTextMesh)
        rootObject.add(topCopperTextMesh)
      }
    }

    // Bottom copper text
    if (visibility.bottomCopper) {
      const bottomCopperTextMesh = createTexturePlane(
        textures.bottomCopperText,
        -pcbThickness / 2 - BOARD_SURFACE_OFFSET.copper,
        true,
        "jscad-bottom-copper-text",
        true,
      )
      if (bottomCopperTextMesh) {
        meshes.push(bottomCopperTextMesh)
        rootObject.add(bottomCopperTextMesh)
      }
    }

    // Top copper pours
    if (visibility.topCopper) {
      const topCopperMesh = createTexturePlane(
        textures.topCopper,
        pcbThickness / 2 + BOARD_SURFACE_OFFSET.copper,
        false,
        "jscad-top-copper-pour",
        true,
      )
      if (topCopperMesh) {
        meshes.push(topCopperMesh)
        rootObject.add(topCopperMesh)
      }
    }

    // Bottom copper pours
    if (visibility.bottomCopper) {
      const bottomCopperMesh = createTexturePlane(
        textures.bottomCopper,
        -pcbThickness / 2 - BOARD_SURFACE_OFFSET.copper,
        true,
        "jscad-bottom-copper-pour",
        true,
      )
      if (bottomCopperMesh) {
        meshes.push(bottomCopperMesh)
        rootObject.add(bottomCopperMesh)
      }
    }

    // Panel outlines
    if (visibility.boardBody) {
      const topPanelOutlinesMesh = createTexturePlane(
        textures.topPanelOutlines,
        pcbThickness / 2 + SURFACE_OFFSET + 0.003, // Above silkscreen
        false,
        "jscad-top-panel-outlines",
        false,
        true,
      )
      if (topPanelOutlinesMesh) {
        meshes.push(topPanelOutlinesMesh)
        rootObject.add(topPanelOutlinesMesh)
      }

      const bottomPanelOutlinesMesh = createTexturePlane(
        textures.bottomPanelOutlines,
        -pcbThickness / 2 - SURFACE_OFFSET - 0.003, // Below bottom silkscreen
        true,
        "jscad-bottom-panel-outlines",
        false,
        true,
      )
      if (bottomPanelOutlinesMesh) {
        meshes.push(bottomPanelOutlinesMesh)
        rootObject.add(bottomPanelOutlinesMesh)
      }
    }

    return () => {
      meshes.forEach((mesh) => {
        if (mesh.parent === rootObject) {
          rootObject.remove(mesh)
        }
        mesh.geometry.dispose()
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose()
        }
      })
    }
  }, [rootObject, boardData, textures, pcbThickness, visibility])

  return null
}
