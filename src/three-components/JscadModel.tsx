import type { JscadOperation } from "jscad-planner"
import { executeJscadOperations } from "jscad-planner"
import jscad from "@jscad/modeling"
import { convertCSGToThreeGeom } from "jscad-electronics/vanilla"
import * as THREE from "three"
import { useMemo, useEffect } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { useThree } from "src/react-three/ThreeContext"

export const JscadModel = ({
  jscadPlan,
  positionOffset,
  rotationOffset,
  onHover,
  onUnhover,
  isHovered,
}: {
  jscadPlan: JscadOperation
  positionOffset?: [number, number, number]
  rotationOffset?: [number, number, number]
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
}) => {
  const { rootObject } = useThree()
  const { threeGeom, material } = useMemo(() => {
    const jscadObject = executeJscadOperations(jscad as any, jscadPlan)

    if (!jscadObject || (!jscadObject.polygons && !jscadObject.sides)) {
      return { threeGeom: null, material: null }
    }

    const threeGeom = convertCSGToThreeGeom(jscadObject)

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide, // Ensure both sides are visible
    })
    return { threeGeom, material }
  }, [jscadPlan])

  const mesh = useMemo(() => {
    if (!threeGeom) return null
    return new THREE.Mesh(threeGeom, material)
  }, [threeGeom, material])

  useEffect(() => {
    if (!mesh || !rootObject) return
    rootObject.add(mesh)
    return () => {
      rootObject.remove(mesh)
    }
  }, [rootObject, mesh])

  useEffect(() => {
    if (!mesh) return
    if (positionOffset) mesh.position.fromArray(positionOffset)
    if (rotationOffset) mesh.rotation.fromArray(rotationOffset)
  }, [
    mesh,
    positionOffset?.[0],
    positionOffset?.[1],
    positionOffset?.[2],
    rotationOffset?.[0],
    rotationOffset?.[1],
    rotationOffset?.[2],
  ])

  useMemo(() => {
    if (!material) return
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
      object={mesh}
    >
      {/* mesh is now added imperatively */}
    </ContainerWithTooltip>
  )
}
