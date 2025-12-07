import { useEffect, useMemo } from "react"
import * as THREE from "three"
import type { AnyCircuitElement } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { useThree } from "../react-three/ThreeContext"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import { createSoldermaskTextureForLayer } from "../utils/soldermask-texture"
import { createSilkscreenTextureForLayer } from "../utils/silkscreen-texture"
import { createTraceTextureForLayer } from "../utils/trace-texture"
import {
  colors as defaultColors,
  soldermaskColors,
  TRACE_TEXTURE_RESOLUTION,
} from "../geoms/constants"

interface JscadBoardTexturesProps {
  circuitJson: AnyCircuitElement[]
  pcbThickness: number
}

export function JscadBoardTextures({
  circuitJson,
  pcbThickness,
}: JscadBoardTexturesProps) {
  const { rootObject } = useThree()
  const { visibility } = useLayerVisibility()

  const boardData = useMemo(() => {
    const boards = su(circuitJson).pcb_board.list()
    return boards.length > 0 ? boards[0]! : null
  }, [circuitJson])

  const textures = useMemo(() => {
    if (!boardData || !boardData.width || !boardData.height) return null

    // Soldermask color
    const soldermaskColorArr =
      soldermaskColors[boardData.material] ?? defaultColors.fr4SolderMaskGreen
    const soldermaskColor = `rgb(${Math.round(soldermaskColorArr[0] * 255)}, ${Math.round(soldermaskColorArr[1] * 255)}, ${Math.round(soldermaskColorArr[2] * 255)})`

    // Silkscreen color
    const silkscreenColor = "rgb(255,255,255)"

    // Trace color with mask (visible through soldermask)
    const traceColorWithMaskArr = defaultColors.fr4TracesWithMaskGreen
    const traceColorWithMask = `rgb(${Math.round(traceColorWithMaskArr[0] * 255)}, ${Math.round(traceColorWithMaskArr[1] * 255)}, ${Math.round(traceColorWithMaskArr[2] * 255)})`

    return {
      topSoldermask: createSoldermaskTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        soldermaskColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      }),
      bottomSoldermask: createSoldermaskTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        soldermaskColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      }),
      topSilkscreen: createSilkscreenTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        silkscreenColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      }),
      bottomSilkscreen: createSilkscreenTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        silkscreenColor,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      }),
      topTraceWithMask: createTraceTextureForLayer({
        layer: "top",
        circuitJson,
        boardData,
        traceColor: traceColorWithMask,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      }),
      bottomTraceWithMask: createTraceTextureForLayer({
        layer: "bottom",
        circuitJson,
        boardData,
        traceColor: traceColorWithMask,
        traceTextureResolution: TRACE_TEXTURE_RESOLUTION,
      }),
    }
  }, [circuitJson, boardData])

  useEffect(() => {
    if (!rootObject || !boardData || !textures) return

    const meshes: THREE.Mesh[] = []

    const createTexturePlane = (
      texture: THREE.CanvasTexture | null | undefined,
      zOffset: number,
      isBottomLayer: boolean,
      name: string,
      usePolygonOffset = false,
    ) => {
      if (!texture) return null
      const planeGeom = new THREE.PlaneGeometry(
        boardData.width!,
        boardData.height!,
      )
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: usePolygonOffset,
        polygonOffsetFactor: usePolygonOffset ? -1 : 0,
        polygonOffsetUnits: usePolygonOffset ? -1 : 0,
      })
      const mesh = new THREE.Mesh(planeGeom, material)
      mesh.position.set(boardData.center.x, boardData.center.y, zOffset)
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
    if (visibility.topCopper && visibility.topMask) {
      const topTraceWithMaskMesh = createTexturePlane(
        textures.topTraceWithMask,
        pcbThickness / 2 + SURFACE_OFFSET + 0.001,
        false,
        "jscad-top-trace-with-mask",
      )
      if (topTraceWithMaskMesh) {
        meshes.push(topTraceWithMaskMesh)
        rootObject.add(topTraceWithMaskMesh)
      }
    }

    // Bottom trace with mask
    if (visibility.bottomCopper && visibility.bottomMask) {
      const bottomTraceWithMaskMesh = createTexturePlane(
        textures.bottomTraceWithMask,
        -pcbThickness / 2 - SURFACE_OFFSET - 0.001,
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
