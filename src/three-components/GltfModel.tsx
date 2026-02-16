import { useState, useEffect, useMemo } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"
import { useThree } from "src/react-three/ThreeContext"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { getDefaultEnvironmentMap } from "src/react-three/getDefaultEnvironmentMap"

const DEFAULT_ENV_MAP_INTENSITY = 1.75

export function GltfModel({
  gltfUrl,
  position,
  rotation,
  onHover,
  onUnhover,
  isHovered,
  scale,
  isTranslucent = false,
}: {
  gltfUrl: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
  scale?: number
  isTranslucent?: boolean
}) {
  const { renderer, rootObject } = useThree()
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [loadError, setLoadError] = useState<Error | null>(null)

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
          }
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
    if (!model) return
    if (position) model.position.fromArray(position)
    if (rotation) model.rotation.fromArray(rotation)
    if (scale !== undefined) model.scale.setScalar(scale)
  }, [
    model,
    position?.[0],
    position?.[1],
    position?.[2],
    rotation?.[0],
    rotation?.[1],
    rotation?.[2],
    scale,
  ])

  useEffect(() => {
    if (!rootObject || !model) return
    rootObject.add(model)
    return () => {
      rootObject.remove(model)
    }
  }, [rootObject, model])

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
      object={model}
    >
      {/* model is now added imperatively */}
    </ContainerWithTooltip>
  )
}
