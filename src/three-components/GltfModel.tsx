import { useCallback, useEffect, useRef, useState } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { getDefaultEnvironmentMap } from "src/react-three/getDefaultEnvironmentMap"
import { useThree } from "src/react-three/ThreeContext"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import {
  applyGltfSceneMaterialState,
  disposeGltfSceneResources,
} from "src/utils/gltf-scene-lifecycle"
import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"
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
  const ownedModelRef = useRef<THREE.Group | null>(null)
  const replaceOwnedModel = useCallback((nextModel: THREE.Group | null) => {
    setModel((previousModel) => {
      if (previousModel && previousModel !== nextModel) {
        disposeGltfSceneResources(previousModel)
      }
      ownedModelRef.current = nextModel
      return nextModel
    })
  }, [])
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
    if (!gltfUrl) {
      setLoadError(null)
      replaceOwnedModel(null)
      return
    }

    const loader = new GLTFLoader()
    let isMounted = true
    setLoadError(null)
    replaceOwnedModel(null)

    loader.load(
      gltfUrl,
      (gltf) => {
        const scene = gltf.scene

        if (!isMounted) {
          disposeGltfSceneResources(scene)
          return
        }

        replaceOwnedModel(scene)
      },
      undefined,
      (error) => {
        if (!isMounted) return
        console.error(`An error happened loading ${gltfUrl}`, error)
        const err =
          error instanceof Error
            ? error
            : new Error(`Failed to load glTF model from ${gltfUrl}`)
        setLoadError(err)
      },
    )
    return () => {
      isMounted = false
    }
  }, [gltfUrl, replaceOwnedModel])

  useEffect(() => {
    return () => {
      if (ownedModelRef.current) {
        disposeGltfSceneResources(ownedModelRef.current)
        ownedModelRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!model) return
    applyGltfSceneMaterialState(model, { isTranslucent })
  }, [model, isTranslucent])

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
