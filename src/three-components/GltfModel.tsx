import { useEffect } from "react"
import * as THREE from "three"
import { useThree } from "src/react-three/ThreeContext"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { getDefaultEnvironmentMap } from "src/react-three/getDefaultEnvironmentMap"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import { useCadModelTransformGraph } from "./useCadModelTransformGraph"
import { useGlobalGltfLoader } from "src/hooks/use-global-gltf-loader"

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
  const model = useGlobalGltfLoader(gltfUrl)
  const { boardTransformGroup } = useCadModelTransformGraph({
    model: model instanceof Error ? null : model,
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
    if (!model || model instanceof Error) return

    model.traverse((child) => {
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
  }, [model, isTranslucent])

  useEffect(() => {
    if (!model || model instanceof Error || !renderer) return

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
    if (!model || model instanceof Error) return
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]

      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue

        if (isHovered) {
          material.emissive.setHex(0x0000ff)
          material.emissiveIntensity = 0.2
        } else {
          material.emissiveIntensity = 0
        }
      }
    })
  }, [isHovered, model])

  if (model instanceof Error) {
    console.error(`An error happened loading ${gltfUrl}`, model)
    throw model
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
