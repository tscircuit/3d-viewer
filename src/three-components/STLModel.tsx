import { useLoader } from "@react-three/fiber"
import { useRef, useMemo } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import * as THREE from "three"
import { MTLLoader, OBJLoader, STLLoader } from "three-stdlib"

export function STLModel({
  stlUrl,
  mtlUrl,
  color,
  opacity = 1,
  onHover,
  onUnhover,
  isHovered,
  isHighlighted,
}: {
  stlUrl: string
  color?: any
  mtlUrl?: string
  opacity?: number
  onHover?: () => void
  onUnhover?: () => void
  isHovered?: boolean
  isHighlighted?: boolean
}) {
  const geom = useLoader(STLLoader, stlUrl)
  const mesh = useRef<THREE.Mesh>()

  // Create material with highlighting support
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      transparent: opacity !== 1,
      opacity: opacity,
    })
    return mat
  }, [color, opacity])

  // Apply highlighting effects
  useMemo(() => {
    if (isHighlighted) {
      // Bright cyan highlight for better contrast - more eye-catching
      material.emissive.setRGB(0, 1, 1) // Cyan highlight
      material.emissiveIntensity = 1.2 // Increased for more eye-catching effect
      // Add slight metalness for more visual pop
      material.metalness = 0.4
      material.roughness = 0.1
    } else if (isHovered) {
      // Warm orange for hover state
      material.emissive.setRGB(1, 0.6, 0) // Orange hover
      material.emissiveIntensity = 0.4
      material.metalness = 0.1
      material.roughness = 0.4
    } else {
      // Reset to default material properties
      material.emissiveIntensity = 0
      material.metalness = 0
      material.roughness = 0.5
    }
  }, [isHovered, isHighlighted, material])

  // TODO handle mtl url

  if (!onHover || !onUnhover) {
    // Fallback for when no interaction handlers are provided
    return (
      <mesh ref={mesh as any}>
        <primitive object={geom} attach="geometry" />
        <primitive object={material} attach="material" />
      </mesh>
    )
  }

  return (
    <ContainerWithTooltip
      isHovered={isHovered || false}
      isHighlighted={isHighlighted}
      onHover={onHover}
      onUnhover={onUnhover}
    >
      <mesh ref={mesh as any}>
        <primitive object={geom} attach="geometry" />
        <primitive object={material} attach="material" />
      </mesh>
    </ContainerWithTooltip>
  )
}
