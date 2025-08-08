import ContainerWithTooltip from "src/ContainerWithTooltip"
import { useGlobalObjLoader } from "src/hooks/use-global-obj-loader"
import type { Euler, Vector3 } from "three"
import { useThree } from "src/react-three-replacement/ThreeContext"
import { useEffect, useMemo } from "react"
import * as THREE from "three"

export function MixedStlModel({
  url,
  position,
  rotation,
  onHover,
  onUnhover,
  isHovered,
}: {
  url: string
  position?: Vector3 | [number, number, number]
  rotation?: Euler | [number, number, number]
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
}) {
  const obj = useGlobalObjLoader(url)
  const { rootObject } = useThree()

  const model = useMemo(() => {
    if (obj && !(obj instanceof Error)) {
      return obj
    }
    // Fallback mesh
    return new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({
        transparent: true,
        color: "red",
        opacity: 0.25,
      }),
    )
  }, [obj])

  useEffect(() => {
    if (!rootObject || !model) return

    if (position) {
      if (Array.isArray(position)) {
        model.position.fromArray(position)
      } else {
        model.position.copy(position as THREE.Vector3)
      }
    }
    if (rotation) {
      if (Array.isArray(rotation)) {
        model.rotation.fromArray(rotation)
      } else {
        model.rotation.copy(rotation as THREE.Euler)
      }
    }

    rootObject.add(model)
    return () => {
      rootObject.remove(model)
    }
  }, [rootObject, model, position, rotation])

  if (obj instanceof Error) {
    throw obj
  }

  return (
    <ContainerWithTooltip
      isHovered={isHovered}
      onHover={onHover}
      onUnhover={onUnhover}
      object={model}
    >
      {/* This component now just manages hover state, the 3D object is added imperatively */}
    </ContainerWithTooltip>
  )
}
