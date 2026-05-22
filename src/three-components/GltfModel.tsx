import { useEffect, useRef, useState } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { getDefaultEnvironmentMap } from "src/react-three/getDefaultEnvironmentMap"
import { useThree } from "src/react-three/ThreeContext"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import {
  disposeGltfModelInstance,
  loadCachedGltfScene,
} from "src/utils/gltf-model-cache"
import * as THREE from "three"
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
  const modelRef = useRef<THREE.Group | null>(null)
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
    let isCancelled = false

    if (modelRef.current) {
      disposeGltfModelInstance(modelRef.current)
      modelRef.current = null
    }
    setModel(null)
    setLoadError(null)

    loadCachedGltfScene(gltfUrl)
      .then((scene) => {
        if (isCancelled) {
          disposeGltfModelInstance(scene)
          return
        }
        modelRef.current = scene
        setModel(scene)
      })
      .catch((error) => {
        if (isCancelled) return
        console.error(`An error happened loading ${gltfUrl}`, error)
        const err =
          error instanceof Error
            ? error
            : new Error(`Failed to load glTF model from ${gltfUrl}`)
        setLoadError(err)
      })

    return () => {
      isCancelled = true
    }
  }, [gltfUrl])

  useEffect(() => {
    if (!model) return

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.material) return

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
    })
  }, [model, isTranslucent])

  useEffect(() => {
    return () => {
      if (modelRef.current) {
        disposeGltfModelInstance(modelRef.current)
        modelRef.current = null
      }
    }
  }, [])

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
      for (const {
        material,
        envMap,
        envMapIntensity,
      } of previousMaterialState) {
        material.envMap = envMap
        material.envMapIntensity = envMapIntensity
        material.needsUpdate = true
      }
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
