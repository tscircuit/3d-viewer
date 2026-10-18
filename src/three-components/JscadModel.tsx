import jscad from "@jscad/modeling"
import { convertCSGToThreeGeom } from "jscad-electronics/vanilla"
import type { JscadOperation } from "jscad-planner"
import { executeJscadOperations } from "jscad-planner"
import { useEffect, useState } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import { configureObjectShadows } from "src/utils/configure-object-shadows"
import * as THREE from "three"
import { useCadModelTransformGraph } from "./useCadModelTransformGraph"

type JscadPlanInput =
  | JscadOperation
  | JscadOperation[]
  | { geometries?: unknown[] }

function resolveJscadGeometries(jscadPlan: JscadPlanInput): Array<{
  geom: any
  color?: THREE.ColorRepresentation | [number, number, number]
}> {
  if (!jscadPlan) return []

  const rawItems = Array.isArray(jscadPlan)
    ? jscadPlan.flat(Infinity)
    : Array.isArray((jscadPlan as { geometries?: unknown[] }).geometries)
      ? (jscadPlan as { geometries: unknown[] }).geometries.flat(Infinity)
      : [jscadPlan]

  const results: Array<{
    geom: any
    color?: THREE.ColorRepresentation | [number, number, number]
  }> = []

  for (const item of rawItems as any[]) {
    if (!item) continue

    if (item.geom && (item.geom.polygons || item.geom.sides)) {
      results.push({
        geom: item.geom,
        color: item.color ?? item.geom.color,
      })
      continue
    }

    if (item.polygons || item.sides) {
      results.push({
        geom: item,
        color: item.color,
      })
      continue
    }

    const executed = executeJscadOperations(jscad as any, item)
    const executedList = Array.isArray(executed)
      ? executed.flat(Infinity)
      : [executed]

    for (const geom of executedList as any[]) {
      const resolvedGeom = geom?.geom ?? geom
      if (!resolvedGeom || (!resolvedGeom.polygons && !resolvedGeom.sides)) {
        continue
      }
      results.push({
        geom: resolvedGeom,
        color: geom?.color ?? resolvedGeom.color ?? item.color,
      })
    }
  }

  return results
}

function buildMeshFromJscadEntry(entry: {
  geom: any
  color?: THREE.ColorRepresentation | [number, number, number]
}): THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
  let geomToConvert = entry.geom
  if (entry.color !== undefined && !Array.isArray(entry.geom.color)) {
    if (Array.isArray(entry.color)) {
      geomToConvert = {
        ...entry.geom,
        color: entry.color.slice(0, 3),
      }
    } else {
      const threeColor = new THREE.Color(entry.color)
      threeColor.convertLinearToSRGB()
      geomToConvert = {
        ...entry.geom,
        color: [threeColor.r, threeColor.g, threeColor.b],
      }
    }
  }

  const geometry = convertCSGToThreeGeom(geomToConvert)
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  })
  return new THREE.Mesh(geometry, material)
}

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
  jscadPlan: JscadPlanInput
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
  const [modelObject, setModelObject] = useState<THREE.Object3D | null>(null)

  // Geometry belongs to the plan, not the display mode. Own these resources in
  // an effect so replacements, unmounts and StrictMode replay all release them.
  useEffect(() => {
    const entries = resolveJscadGeometries(jscadPlan)
    if (entries.length === 0) {
      setModelObject(null)
      return
    }

    const meshes = entries.map((entry) => buildMeshFromJscadEntry(entry))
    const rootModel: THREE.Object3D =
      meshes.length === 1
        ? meshes[0]!
        : (() => {
            const group = new THREE.Group()
            for (const m of meshes) {
              group.add(m)
            }
            return group
          })()

    setModelObject(rootModel)

    return () => {
      for (const m of meshes) {
        m.geometry.dispose()
        m.material.dispose()
      }
    }
  }, [jscadPlan])

  useEffect(() => {
    if (!modelObject) return
    modelObject.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        const material = child.material
        material.transparent = isTranslucent
        material.opacity = isTranslucent ? 0.5 : 1
        material.depthWrite = !isTranslucent
        material.needsUpdate = true
        child.renderOrder = isTranslucent ? 2 : 1
        configureObjectShadows(child, {
          castShadow: !isTranslucent,
          receiveShadow: true,
        })
      }
    })
  }, [modelObject, isTranslucent])

  const { boardTransformGroup } = useCadModelTransformGraph({
    model: modelObject,
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
    if (!modelObject) return
    modelObject.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        const material = child.material
        if (isHovered) {
          const color = new THREE.Color(material.color.getHex())
          material.emissive.copy(color)
          material.emissive.setRGB(0, 0, 1)
          material.emissiveIntensity = 0.2
        } else {
          material.emissiveIntensity = 0
        }
      }
    })
  }, [isHovered, modelObject])

  if (!modelObject) return null

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
