import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { useThree } from "./ThreeContext"

type PresentationStageProps = {
  enabled: boolean
  boardDimensions?: { width?: number; height?: number }
  boardCenter?: { x: number; y: number }
  pcbThickness?: number | null
}

export const PresentationStage = ({
  enabled,
  boardDimensions,
  boardCenter,
  pcbThickness,
}: PresentationStageProps) => {
  const { rootObject, scene } = useThree()

  const floorMesh = useMemo(() => {
    if (!enabled || !boardDimensions) return null

    const centerX = boardCenter?.x ?? 0
    const centerY = boardCenter?.y ?? 0
    const largest = Math.max(
      boardDimensions.width ?? 0,
      boardDimensions.height ?? 0,
      20,
    )
    const floorSize = largest * 2.5
    const geometry = new THREE.PlaneGeometry(floorSize, floorSize)
    const material = new THREE.ShadowMaterial({
      color: 0x000000,
      opacity: 0.28,
      transparent: true,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = "presentation-studio-floor"
    mesh.position.set(centerX, centerY, -(pcbThickness ?? 1.6) / 2 - 0.35)
    mesh.receiveShadow = true
    mesh.castShadow = false
    mesh.frustumCulled = false
    return mesh
  }, [boardCenter, boardDimensions, enabled, pcbThickness])

  useEffect(() => {
    if (!scene || !enabled) return
    const previousBackground = scene.background
    scene.background = null
    return () => {
      scene.background = previousBackground
    }
  }, [enabled, scene])

  useEffect(() => {
    if (!rootObject || !floorMesh) return
    rootObject.add(floorMesh)
    return () => {
      rootObject.remove(floorMesh)
      floorMesh.geometry.dispose()
      const material = floorMesh.material
      if (Array.isArray(material)) {
        material.forEach((mat) => mat.dispose())
      } else {
        material.dispose()
      }
    }
  }, [floorMesh, rootObject])

  return null
}
