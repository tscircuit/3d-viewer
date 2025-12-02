import {
  convertCSGToThreeGeom,
  getJscadModelForFootprint,
} from "jscad-electronics/vanilla"
import { useMemo, useEffect } from "react"
import * as jscadModeling from "@jscad/modeling"
import * as THREE from "three"
import { useThree } from "src/react-three/ThreeContext"
import ContainerWithTooltip from "src/ContainerWithTooltip"

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
      })
      const mesh = new THREE.Mesh(threeGeom, material)
      group.add(mesh)
    }

    return group
  }, [footprint])

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

  useEffect(() => {
    if (!group || !isTranslucent) return

    const originalMaterials: {
      mesh: THREE.Mesh
      material: THREE.Material | THREE.Material[]
    }[] = []

    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        // Save original material(s)
        originalMaterials.push({ mesh: child, material: child.material })

        // Clone to avoid mutating shared materials
        const makeTransparent = (mat: THREE.Material) => {
          const clone = mat.clone()
          clone.transparent = true
          clone.opacity = 0.5
          clone.depthWrite = false
          clone.needsUpdate = true
          return clone
        }

        if (Array.isArray(child.material)) {
          child.material = child.material.map(makeTransparent)
        } else {
          child.material = makeTransparent(child.material)
        }
      }
    })

    // Cleanup — restore original materials
    return () => {
      originalMaterials.forEach(({ mesh, material }) => {
        mesh.material = material
      })
    }
  }, [group, isTranslucent])

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
