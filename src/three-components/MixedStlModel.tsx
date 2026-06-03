import { useEffect, useMemo } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { useGlobalObjLoader } from "src/hooks/use-global-obj-loader"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import type { Euler, Vector3 } from "three"
import * as THREE from "three"
import { useCadModelTransformGraph } from "./useCadModelTransformGraph"

const MIXED_STL_FALLBACK_MODEL_KEY = "__tscircuitMixedStlFallbackModel"

export function createMixedStlFallbackModel() {
  const fallbackModel = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({
      transparent: true,
      color: "red",
      opacity: 0.25,
    }),
  )
  fallbackModel.userData[MIXED_STL_FALLBACK_MODEL_KEY] = true
  return fallbackModel
}

function isMixedStlFallbackModel(model: THREE.Object3D) {
  return model.userData[MIXED_STL_FALLBACK_MODEL_KEY] === true
}

export function disposeObject3DResources(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    child.geometry?.dispose()
    if (Array.isArray(child.material)) {
      for (const material of child.material) {
        material.dispose()
      }
    } else {
      child.material?.dispose()
    }
  })
}

export function MixedStlModel({
  url,
  position,
  rotation,
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
  url: string
  position?: Vector3 | [number, number, number]
  rotation?: Euler | [number, number, number]
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
}) {
  const obj = useGlobalObjLoader(url)
  const model = useMemo(() => {
    if (obj && !(obj instanceof Error)) {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const setMaterialTransparency = (mat: THREE.Material) => {
            mat.transparent = isTranslucent
            mat.opacity = isTranslucent ? 0.5 : 1
            mat.depthWrite = !isTranslucent
            mat.needsUpdate = true
          }

          if (Array.isArray(child.material)) {
            child.material.forEach(setMaterialTransparency)
          } else {
            setMaterialTransparency(child.material)
          }

          child.renderOrder = isTranslucent ? 2 : 1
        }
      })
      return obj
    }
    return createMixedStlFallbackModel()
  }, [obj, isTranslucent])

  useEffect(() => {
    if (!isMixedStlFallbackModel(model)) return

    return () => {
      disposeObject3DResources(model)
    }
  }, [model])

  const { boardTransformGroup } = useCadModelTransformGraph({
    model,
    position: Array.isArray(position)
      ? position
      : position
        ? [position.x, position.y, position.z]
        : undefined,
    rotation: Array.isArray(rotation)
      ? rotation
      : rotation
        ? [rotation.x, rotation.y, rotation.z]
        : undefined,
    modelOffset,
    modelRotation,
    sourceCoordinateTransform,
    modelSize,
    modelFitMode,
    scale,
  })

  if (obj instanceof Error) {
    throw obj
  }

  return (
    <ContainerWithTooltip
      isHovered={isHovered}
      onHover={onHover}
      onUnhover={onUnhover}
      object={boardTransformGroup}
    >
      {/* This component now just manages hover state, the 3D object is added imperatively */}
    </ContainerWithTooltip>
  )
}
