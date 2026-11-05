import {
  convertCSGToThreeGeom,
  getJscadModelForFootprint,
} from "jscad-electronics/vanilla"
import { useMemo, useEffect } from "react"
import * as jscadModeling from "@jscad/modeling"
import * as THREE from "three"
import { useThree } from "src/react-three/ThreeContext"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { configureObjectShadows } from "src/utils/configure-object-shadows"

const FOOTPRINT_WITHOUT_3D_MODEL_REGEX =
  /^(solderjumper|fiducial|pad|smtpad|smdpads|platedhole)(\d|_|$)/i

export const isFootprintWithout3dModel = (
  footprint?: string | null,
): boolean => {
  if (!footprint) return true
  return FOOTPRINT_WITHOUT_3D_MODEL_REGEX.test(footprint.trim())
}

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
  const group = useMemo(() => {
    if (isFootprintWithout3dModel(footprint)) return null
    let geometries: any[] = []
    try {
      geometries =
        getJscadModelForFootprint(footprint, jscadModeling)?.geometries ?? []
    } catch (error) {
      if (
        error instanceof Error &&
        /Invalid footprint function,\s*got\s*"(solderjumper|fiducial|pad|smtpad|smdpads|platedhole)"/i.test(
          error.message,
        )
      ) {
        return null
      }
      throw error
    }

    const group = new THREE.Group()

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
        transparent: isTranslucent,
        opacity: isTranslucent ? 0.5 : 1,
        depthWrite: !isTranslucent,
      })
      const mesh = new THREE.Mesh(threeGeom, material)
      mesh.renderOrder = isTranslucent ? 2 : 1
      configureObjectShadows(mesh, {
        castShadow: !isTranslucent,
        receiveShadow: true,
      })
      group.add(mesh)
    }

    if (group.children.length === 0) return null

    return group
  }, [footprint, isTranslucent])

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
