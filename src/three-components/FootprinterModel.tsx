import * as jscadModeling from "@jscad/modeling"
import {
  convertCSGToThreeGeom,
  getJscadModelForFootprint,
} from "jscad-electronics/vanilla"
import { useEffect, useMemo } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import { configureObjectShadows } from "src/utils/configure-object-shadows"
import * as THREE from "three"
import { useCadModelTransformGraph } from "./useCadModelTransformGraph"

export const FootprinterModel = ({
  positionOffset,
  footprint,
  rotationOffset,
  modelOffset = [0, 0, 0],
  modelRotation = [0, 0, 0],
  sourceCoordinateTransform,
  modelSize,
  modelFitMode = "contain_within_bounds",
  onHover,
  onUnhover,
  isHovered,
  scale,
  isTranslucent = false,
}: {
  positionOffset?: [number, number, number]
  footprint: string
  rotationOffset?: [number, number, number]
  modelOffset?: [number, number, number]
  modelRotation?: [number, number, number]
  sourceCoordinateTransform?: THREE.Matrix4
  modelSize?: CadModelSize
  modelFitMode?: CadModelFitMode
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
  scale?: number
  isTranslucent?: boolean
}) => {
  const group = useMemo(() => {
    if (!footprint) return null
    const { geometries } = getJscadModelForFootprint(footprint, jscadModeling)

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

    return group
  }, [footprint, isTranslucent])

  const { boardTransformGroup } = useCadModelTransformGraph({
    model: group,
    position: positionOffset,
    rotation: rotationOffset,
    modelOffset,
    modelRotation,
    sourceCoordinateTransform,
    modelSize,
    modelFitMode,
    scale,
  })

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
      object={boardTransformGroup}
    >
      {/* group is now added imperatively */}
    </ContainerWithTooltip>
  )
}
