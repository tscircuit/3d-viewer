import {
  convertCSGToThreeGeom,
  getJscadModelForFootprint,
} from "jscad-electronics/vanilla"
import { useState, useEffect } from "react"
import * as jscadModeling from "@jscad/modeling"
import * as THREE from "three"
import { useThree } from "src/react-three/ThreeContext"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { configureObjectShadows } from "src/utils/configure-object-shadows"

export const FootprinterModel = ({
  positionOffset,
  footprint,
  rotationOffset,
  onHover,
  onUnhover,
  isHovered,
  scale,
  isTranslucent = false,
}: {
  positionOffset: any
  footprint: string
  rotationOffset?: [number, number, number]
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
  scale?: number
  isTranslucent?: boolean
}) => {
  const { rootObject } = useThree()
  const [group, setGroup] = useState<THREE.Group | null>(null)

  // Geometry belongs to the footprint, not the display mode. Own these resources
  // in an effect so replacements, unmounts and StrictMode replay all release them.
  useEffect(() => {
    if (!footprint) {
      setGroup(null)
      return
    }
    const { geometries } = getJscadModelForFootprint(footprint, jscadModeling)

    const createdGroup = new THREE.Group()

    for (const geomInfo of geometries.flat(Infinity) as any[]) {
      const geom = geomInfo.geom
      if (!geom || (!geom.polygons && !geom.sides)) {
        continue
      }
      const color = new THREE.Color(geomInfo.color)
      color.convertLinearToSRGB()
      const geomWithColor = { ...geom, color: [color.r, color.g, color.b] }

      const threeGeom = convertCSGToThreeGeom(geomWithColor)
      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(threeGeom, material)
      createdGroup.add(mesh)
    }

    setGroup(createdGroup)

    return () => {
      createdGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (Array.isArray(child.material)) {
            for (const material of child.material) {
              material.dispose()
            }
          } else {
            child.material.dispose()
          }
        }
      })
    }
  }, [footprint])

  useEffect(() => {
    if (!group) return
    group.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        child.material.transparent = isTranslucent
        child.material.opacity = isTranslucent ? 0.5 : 1
        child.material.depthWrite = !isTranslucent
        child.material.needsUpdate = true
        child.renderOrder = isTranslucent ? 2 : 1
        configureObjectShadows(child, {
          castShadow: !isTranslucent,
          receiveShadow: true,
        })
      }
    })
  }, [group, isTranslucent])

  useEffect(() => {
    if (!group || !rootObject) return
    rootObject.add(group)
    return () => {
      rootObject.remove(group)
    }
  }, [rootObject, group])

  useEffect(() => {
    if (!group) return
    if (positionOffset) group.position.fromArray(positionOffset)
    if (rotationOffset) group.rotation.fromArray(rotationOffset)
    if (scale !== undefined) group.scale.setScalar(scale)
  }, [
    group,
    positionOffset?.[0],
    positionOffset?.[1],
    positionOffset?.[2],
    rotationOffset?.[0],
    rotationOffset?.[1],
    rotationOffset?.[2],
    scale,
  ])

  useEffect(() => {
    if (!group) return
    group.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        if (isHovered) {
          child.material.emissive.setHex(0x0000ff)
          child.material.emissiveIntensity = 0.2
        } else {
          child.material.emissiveIntensity = 0
        }
      }
    })
  }, [isHovered, group])

  if (!group) return null

  return (
    <ContainerWithTooltip
      isHovered={isHovered}
      onHover={onHover}
      onUnhover={onUnhover}
      object={group}
    >
      {/* group is now added imperatively */}
    </ContainerWithTooltip>
  )
}
