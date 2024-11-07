import type { JscadOperation } from "jscad-planner"
import { executeJscadOperations } from "jscad-planner"
import jscad from "@jscad/modeling"
import { convertCSGToThreeGeom } from "jscad-fiber"
import * as THREE from "three"
import { useMemo } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"

export const JscadModel = ({
  jscadPlan,
  positionOffset,
  rotationOffset,
  componentId,
  name,
  onHover,
  isHovered,
}: {
  jscadPlan: JscadOperation
  positionOffset?: [number, number, number]
  rotationOffset?: [number, number, number]
  componentId: string
  name: string
  onHover: (id: string | null) => void
  isHovered: boolean
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
    if (isHovered) {
      const color = new THREE.Color(material.color.getHex())
      material.emissive.copy(color)
      // material.emissive.setRGB(0,0,0)
      material.emissiveIntensity = 0.1
    } else {
      material.emissiveIntensity = 0
    }
  }, [isHovered, material])
  if (!threeGeom) return null

  return (
    <ContainerWithTooltip
      componentId={componentId}
      name={name}
      isHovered={isHovered}
      onHover={onHover}
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
