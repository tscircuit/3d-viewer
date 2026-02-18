import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"
import { useEffect, useMemo } from "react"
import { createCombinedBoardTextures } from "src/textures"
import * as THREE from "three"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import {
  FAUX_BOARD_OPACITY,
  TRACE_TEXTURE_RESOLUTION,
} from "../geoms/constants"
import { useThree } from "../react-three/ThreeContext"
import { getLayerTextureResolution } from "../utils/layer-texture-resolution"
import { calculateOutlineBounds } from "../utils/outline-bounds"

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
    return createCombinedBoardTextures({
      circuitJson,
      boardData,
      traceTextureResolution,
      visibility,
    })
  }, [circuitJson, boardData, traceTextureResolution, visibility])

  useEffect(() => {
    if (!rootObject || !boardData || !textures) return

    const meshes: THREE.Mesh[] = []
    const disposeTextureMaterial = (material: THREE.Material) => {
      const textureProps = [
        "map",
        "alphaMap",
        "aoMap",
        "bumpMap",
        "displacementMap",
        "emissiveMap",
        "lightMap",
        "metalnessMap",
        "normalMap",
        "roughnessMap",
        "specularMap",
      ] as const
      const typedMaterial = material as THREE.Material &
        Record<(typeof textureProps)[number], THREE.Texture | null | undefined>

      for (const prop of textureProps) {
        const texture = typedMaterial[prop]
        if (texture && texture instanceof THREE.Texture) {
          texture.dispose()
          typedMaterial[prop] = null
        }
      }

      material.dispose()
    }

    const createTexturePlane = (
      texture: THREE.CanvasTexture | null | undefined,
      zOffset: number,
      isBottomLayer: boolean,
      name: string,
      usePolygonOffset = false,
      depthWrite = true,
      renderOrder = 1,
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
        alphaTest: 0.08,
        side: THREE.DoubleSide,
        depthWrite,
        polygonOffset: usePolygonOffset,
        polygonOffsetFactor: usePolygonOffset ? -4 : 0,
        polygonOffsetUnits: usePolygonOffset ? -4 : 0,
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
      mesh.renderOrder = renderOrder
      mesh.frustumCulled = false
      return mesh
    }

    // Small offset to place textures just above board surface (same as Manifold)
    const SURFACE_OFFSET = 0.005

    const topBoardMesh = createTexturePlane(
      textures.topBoard,
      pcbThickness / 2 + SURFACE_OFFSET,
      false,
      "jscad-top-board-texture",
      true,
    )
    if (topBoardMesh) {
      meshes.push(topBoardMesh)
      rootObject.add(topBoardMesh)
    }

    const bottomBoardMesh = createTexturePlane(
      textures.bottomBoard,
      -pcbThickness / 2 - SURFACE_OFFSET,
      true,
      "jscad-bottom-board-texture",
      true,
    )
    if (bottomBoardMesh) {
      meshes.push(bottomBoardMesh)
      rootObject.add(bottomBoardMesh)
    }

    return () => {
      meshes.forEach((mesh) => {
        if (mesh.parent === rootObject) {
          rootObject.remove(mesh)
        }
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => disposeTextureMaterial(material))
        } else if (mesh.material instanceof THREE.Material) {
          disposeTextureMaterial(mesh.material)
        }
      })

      textures.topBoard?.dispose()
      textures.bottomBoard?.dispose()
    }
  }, [rootObject, boardData, textures, pcbThickness])

  return null
}
