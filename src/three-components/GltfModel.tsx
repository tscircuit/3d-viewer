import { useState, useEffect } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"
import { useThree } from "src/react-three/ThreeContext"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { getDefaultEnvironmentMap } from "src/react-three/getDefaultEnvironmentMap"
import { configureObjectShadows } from "src/utils/configure-object-shadows"
import { useRenderingMode } from "src/contexts/RenderingModeContext"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
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
  const { renderingMode } = useRenderingMode()
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
    const loader = new GLTFLoader()
    let isMounted = true
    loader.load(
      gltfUrl,
      (gltf) => {
        if (!isMounted) return
        const scene = gltf.scene

        scene.traverse((child) => {
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
        configureObjectShadows(scene, {
          castShadow: !isTranslucent,
          receiveShadow: true,
        })

        setModel(scene)
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
  }, [gltfUrl, isTranslucent])

  useEffect(() => {
    if (!model || !renderer) return

    const environmentMap = getDefaultEnvironmentMap(renderer)
    if (!environmentMap) return

    const previousMaterialState: Array<{
      material: THREE.MeshStandardMaterial
      envMap: THREE.Texture | null
      envMapIntensity: number
      roughness: number
      metalness: number
    }> = []

    const applyEnvironmentToMaterial = (
      material: THREE.Material,
      meshName: string,
    ) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return

      previousMaterialState.push({
        material,
        envMap: material.envMap ?? null,
        envMapIntensity: material.envMapIntensity ?? 1,
        roughness: material.roughness,
        metalness: material.metalness,
      })

      material.envMap = environmentMap

      const targetEnvMapIntensity =
        renderingMode === "realistic" ? 1.8 : DEFAULT_ENV_MAP_INTENSITY
      if (material.envMapIntensity < targetEnvMapIntensity) {
        material.envMapIntensity = targetEnvMapIntensity
      }

      if (renderingMode === "realistic") {
        material.roughness = Math.min(material.roughness ?? 0.7, 0.55)

        if (/pin|lead|metal|terminal/i.test(`${material.name} ${meshName}`)) {
          material.metalness = Math.max(material.metalness ?? 0, 0.85)
          material.roughness = Math.min(material.roughness, 0.25)
        }
      }

      material.needsUpdate = true
    }

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      const material = child.material
      if (Array.isArray(material)) {
        material.forEach((mat) => applyEnvironmentToMaterial(mat, child.name))
      } else if (material) {
        applyEnvironmentToMaterial(material, child.name)
      }
    })

    return () => {
      previousMaterialState.forEach(
        ({ material, envMap, envMapIntensity, roughness, metalness }) => {
          material.envMap = envMap
          material.envMapIntensity = envMapIntensity
          material.roughness = roughness
          material.metalness = metalness
          material.needsUpdate = true
        },
      )
    }
  }, [model, renderer, renderingMode])

  useEffect(() => {
    if (!model) return
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
