import { useState, useEffect } from "react"
import * as THREE from "three"
import { useThree } from "src/react-three/ThreeContext"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { getDefaultEnvironmentMap } from "src/react-three/getDefaultEnvironmentMap"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import { loadCachedGltfModel } from "src/utils/load-cached-gltf-model"
import { useCadModelTransformGraph } from "./useCadModelTransformGraph"

const DEFAULT_ENV_MAP_INTENSITY = 1.25

export function GltfModel({
  gltfUrl,
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
  gltfUrl: string
  position?: [number, number, number]
  rotation?: [number, number, number]
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
  const { renderer } = useThree()
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const { boardTransformGroup } = useCadModelTransformGraph({
    model,
    position,
    rotation,
    modelOffset,
    modelRotation,
    sourceCoordinateTransform,
    modelSize,
    modelFitMode,
    scale,
  })

  useEffect(() => {
    if (!gltfUrl) return
    let isMounted = true

    loadCachedGltfModel(gltfUrl).then((loadedModel) => {
      if (!isMounted) return

      if (loadedModel instanceof Error) {
        setLoadError(loadedModel)
        return
      }

      loadedModel.traverse((child) => {
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

      setModel(loadedModel)
    })

    return () => {
      isMounted = false
    }
  }, [gltfUrl, isTranslucent])

  useEffect(() => {
    if (!model || !renderer) return

    const environmentMap = getDefaultEnvironmentMap(renderer)
    if (!environmentMap) return

    const previousMaterialState: Array<{
      material: THREE.MeshStandardMaterial
      envMap: THREE.Texture | null
      envMapIntensity: number
    }> = []

    const applyEnvironmentToMaterial = (material: THREE.Material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return

      previousMaterialState.push({
        material,
        envMap: material.envMap ?? null,
        envMapIntensity: material.envMapIntensity ?? 1,
      })

      material.envMap = environmentMap

      if (
        typeof material.envMapIntensity !== "number" ||
        material.envMapIntensity < DEFAULT_ENV_MAP_INTENSITY
      ) {
        material.envMapIntensity = DEFAULT_ENV_MAP_INTENSITY
      }

      material.needsUpdate = true
    }

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      const material = child.material
      if (Array.isArray(material)) {
        material.forEach(applyEnvironmentToMaterial)
      } else if (material) {
        applyEnvironmentToMaterial(material)
      }
    })

    return () => {
      previousMaterialState.forEach(({ material, envMap, envMapIntensity }) => {
        material.envMap = envMap
        material.envMapIntensity = envMapIntensity
        material.needsUpdate = true
      })
    }
  }, [model, renderer])

  useEffect(() => {
    if (!model) return
    model.traverse((child) => {
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
  }, [isHovered, model])

  if (loadError) {
    throw loadError
  }

  if (!model) return null

  return (
    <ContainerWithTooltip
      isHovered={isHovered}
      onHover={onHover}
      onUnhover={onUnhover}
      object={boardTransformGroup}
    >
      {/* model is now added imperatively */}
    </ContainerWithTooltip>
  )
}
