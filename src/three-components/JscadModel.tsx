import type { JscadOperation } from "jscad-planner"
import { executeJscadOperations } from "jscad-planner"
import jscad from "@jscad/modeling"
import { convertCSGToThreeGeom } from "jscad-electronics/vanilla"
import * as THREE from "three"
import { useState, useEffect } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import { configureObjectShadows } from "src/utils/configure-object-shadows"
import { useCadModelTransformGraph } from "./useCadModelTransformGraph"

export const JscadModel = ({
  jscadPlan,
  positionOffset,
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
  jscadPlan: JscadOperation
  positionOffset?: [number, number, number]
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
  const [mesh, setMesh] = useState<THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshStandardMaterial
  > | null>(null)

  // Geometry belongs to the plan, not the display mode. Own these resources in
  // an effect so replacements, unmounts and StrictMode replay all release them.
  useEffect(() => {
    const jscadObject = executeJscadOperations(jscad as any, jscadPlan)
    if (!jscadObject || (!jscadObject.polygons && !jscadObject.sides)) {
      setMesh(null)
      return
    }

    const geometry = convertCSGToThreeGeom(jscadObject)
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    })
    const model = new THREE.Mesh(geometry, material)
    setMesh(model)

    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [jscadPlan])

  useEffect(() => {
    if (!mesh) return
    const material = mesh.material
    material.transparent = isTranslucent
    material.opacity = isTranslucent ? 0.5 : 1
    material.depthWrite = !isTranslucent
    material.needsUpdate = true
    mesh.renderOrder = isTranslucent ? 2 : 1
    configureObjectShadows(mesh, {
      castShadow: !isTranslucent,
      receiveShadow: true,
    })
  }, [mesh, isTranslucent])

  const material = mesh?.material
  const { boardTransformGroup } = useCadModelTransformGraph({
    model: mesh,
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

  if (!mesh) return null

  return (
    <ContainerWithTooltip
      isHovered={isHovered}
      onHover={onHover}
      onUnhover={onUnhover}
      object={boardTransformGroup}
    >
      {/* mesh is now added imperatively */}
    </ContainerWithTooltip>
  )
}
