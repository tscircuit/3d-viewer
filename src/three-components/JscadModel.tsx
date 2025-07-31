import type { JscadOperation } from "jscad-planner"
import { executeJscadOperations } from "jscad-planner"
import jscad from "@jscad/modeling"
import { convertCSGToThreeGeom } from "jscad-fiber/three"
import * as THREE from "three"
import { useMemo } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"

export const JscadModel = ({
  jscadPlan,
  positionOffset,
  rotationOffset,
  onHover,
  onUnhover,
  isHovered,
  isHighlighted = false,
}: {
  jscadPlan: JscadOperation
  positionOffset?: [number, number, number]
  rotationOffset?: [number, number, number]
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
  isHighlighted?: boolean
}) => {
  const { threeGeom, material } = useMemo(() => {
    const jscadObject = executeJscadOperations(jscad as any, jscadPlan)

    const threeGeom = convertCSGToThreeGeom(jscadObject)

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide, // Ensure both sides are visible
    })
    return { threeGeom, material }
  }, [jscadPlan])

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
  if (!threeGeom) return null

  return (
    <ContainerWithTooltip
      isHovered={isHovered}
      isHighlighted={isHighlighted}
      onHover={onHover}
      onUnhover={onUnhover}
      position={positionOffset}
    >
      <mesh
        geometry={threeGeom}
        material={material}
        position={positionOffset}
        rotation={rotationOffset}
      />
    </ContainerWithTooltip>
  )
}
