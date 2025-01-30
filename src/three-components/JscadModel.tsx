import type { JscadOperation } from "jscad-planner"
import { executeJscadOperations } from "jscad-planner"
import jscad from "@jscad/modeling"
import { convertCSGToThreeGeom } from "jscad-fiber"
import * as THREE from "three"
import { useMemo } from "react"
import { ContainerWithTooltip, type HoverProps } from "src/ContainerWithTooltip"

export type * as tooltip from "src/ContainerWithTooltip"

export function JscadModel({
  jscadPlan,
  positionOffset,
  rotationOffset,
  onHover,
  onUnhover,
  isHovered,
}: HoverProps & {
  jscadPlan: JscadOperation
  positionOffset?: [number, number, number]
  rotationOffset?: [number, number, number]
}) {
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
    if (isHovered) {
      const color = new THREE.Color(material.color.getHex())
      material.emissive.copy(color)
      material.emissive.setRGB(0, 0, 1)
      material.emissiveIntensity = 0.2
    } else {
      material.emissiveIntensity = 0
    }
  }, [isHovered, material])
  if (!threeGeom) return null

  return (
    <ContainerWithTooltip
      isHovered={isHovered}
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
