import { useEffect, useMemo } from "react"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import { useThree } from "../react-three/ThreeContext"
import {
  useSvgBoardTextures,
  usePreloadResvgWasm,
} from "../hooks/useSvgBoardTextures"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { FAUX_BOARD_OPACITY } from "../geoms/constants"

interface SvgBoardTexturesProps {
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard | null
  pcbThickness: number
  isFaux?: boolean
}

/**
 * Component that renders high-quality SVG-based textures on the PCB board faces.
 *
 * This component uses resvg-wasm to generate raster textures from SVG representations
 * of the PCB artwork. This provides better quality than canvas-based rendering,
 * especially for text and fine details.
 *
 * The textures are only rendered when `svgTexturesEnabled` is true in the
 * LayerVisibilityContext.
 */
export function SvgBoardTextures({
  circuitJson,
  boardData,
  pcbThickness,
  isFaux = false,
}: SvgBoardTexturesProps) {
  const { rootObject } = useThree()
  const { visibility } = useLayerVisibility()

  // Preload resvg-wasm on mount
  usePreloadResvgWasm()

  // Generate SVG textures
  const { topTexture, bottomTexture, isLoading, error } = useSvgBoardTextures({
    circuitJson,
    boardData,
    visibility,
  })

  // Check if SVG textures are enabled
  const svgTexturesEnabled = visibility.svgTexturesEnabled ?? false

  // Create meshes when textures are ready
  useEffect(() => {
    if (!rootObject || !boardData || !svgTexturesEnabled) return

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
      texture: THREE.DataTexture | null,
      zOffset: number,
      isBottomLayer: boolean,
      name: string,
    ): THREE.Mesh | null => {
      if (!texture) return null

      const boardOutlineBounds = calculateOutlineBounds(boardData)
      const planeGeom = new THREE.PlaneGeometry(
        boardOutlineBounds.width,
        boardOutlineBounds.height,
      )

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.08,
        side: THREE.FrontSide,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
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
      mesh.renderOrder = 1
      mesh.frustumCulled = false

      return mesh
    }

    // Small offset to place textures just above board surface
    const SURFACE_OFFSET = 0.005

    // Create top texture mesh
    const topBoardMesh = createTexturePlane(
      topTexture,
      pcbThickness / 2 + SURFACE_OFFSET,
      false,
      "svg-top-board-texture",
    )

    if (topBoardMesh) {
      meshes.push(topBoardMesh)
      rootObject.add(topBoardMesh)
    }

    // Create bottom texture mesh
    const bottomBoardMesh = createTexturePlane(
      bottomTexture,
      -pcbThickness / 2 - SURFACE_OFFSET,
      true,
      "svg-bottom-board-texture",
    )

    if (bottomBoardMesh) {
      meshes.push(bottomBoardMesh)
      rootObject.add(bottomBoardMesh)
    }

    // Cleanup function
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
    }
  }, [
    rootObject,
    boardData,
    pcbThickness,
    isFaux,
    topTexture,
    bottomTexture,
    svgTexturesEnabled,
  ])

  // Log errors
  useEffect(() => {
    if (error) {
      console.error("SVG texture generation error:", error)
    }
  }, [error])

  // This component doesn't render any React elements
  return null
}

/**
 * Props for the SvgBoardTexturesDebug component
 */
interface SvgBoardTexturesDebugProps extends SvgBoardTexturesProps {
  /**
   * Optional callback when texture generation status changes
   */
  onStatusChange?: (status: {
    isLoading: boolean
    error: string | null
    hasTopTexture: boolean
    hasBottomTexture: boolean
  }) => void
}

/**
 * Debug version of SvgBoardTextures that reports status.
 * Useful for development and testing.
 */
export function SvgBoardTexturesDebug({
  onStatusChange,
  ...props
}: SvgBoardTexturesDebugProps) {
  const { visibility } = useLayerVisibility()
  const { topTexture, bottomTexture, isLoading, error } = useSvgBoardTextures({
    circuitJson: props.circuitJson,
    boardData: props.boardData,
    visibility,
  })

  useEffect(() => {
    onStatusChange?.({
      isLoading,
      error,
      hasTopTexture: !!topTexture,
      hasBottomTexture: !!bottomTexture,
    })
  }, [isLoading, error, topTexture, bottomTexture, onStatusChange])

  return <SvgBoardTextures {...props} />
}
