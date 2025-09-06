import { useState, useEffect, useMemo } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"
import { useThree } from "src/react-three/ThreeContext"
import ContainerWithTooltip from "src/ContainerWithTooltip"

export function GltfModel({
  gltfUrl,
  position,
  rotation,
  onHover,
  onUnhover,
  isHovered,
}: {
  gltfUrl: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
}) {
  const { rootObject } = useThree()
  const [model, setModel] = useState<THREE.Group | null>(null)

  useEffect(() => {
    if (!gltfUrl) return
    const loader = new GLTFLoader()
    let isMounted = true
    loader.load(
      gltfUrl,
      (gltf) => {
        if (isMounted) setModel(gltf.scene)
      },
      undefined,
      (error) => {
        if (isMounted)
          console.error(`An error happened loading ${gltfUrl}`, error)
      },
    )
    return () => {
      isMounted = false
    }
  }, [gltfUrl])

  useEffect(() => {
    if (!model) return
    if (position) model.position.fromArray(position)
    if (rotation) model.rotation.fromArray(rotation)
  }, [
    model,
    position?.[0],
    position?.[1],
    position?.[2],
    rotation?.[0],
    rotation?.[1],
    rotation?.[2],
  ])

  useEffect(() => {
    if (!rootObject || !model) return
    rootObject.add(model)
    return () => {
      rootObject.remove(model)
    }
  }, [rootObject, model])

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
