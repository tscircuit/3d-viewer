import ContainerWithTooltip from "src/ContainerWithTooltip"
import { useGlobalObjLoader } from "src/hooks/use-global-obj-loader"
import type { Euler, Vector3 } from "three"
import { useThree } from "src/react-three/ThreeContext"
import { useEffect, useMemo } from "react"
import * as THREE from "three"

export function MixedStlModel({
  url,
  position,
  rotation,
  onHover,
  onUnhover,
  isHovered,
  scale,
  isTranslucent = false,
}: {
  url: string
  position?: Vector3 | [number, number, number]
  rotation?: Euler | [number, number, number]
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
  scale?: number
  isTranslucent?: boolean
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

    rootObject.add(model)
    return () => {
      rootObject.remove(model)
    }
  }, [rootObject, model])

  useEffect(() => {
    if (!model) return
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
    if (scale !== undefined) {
      model.scale.setScalar(scale)
    }
  }, [
    model,
    Array.isArray(position) ? position[0] : (position as THREE.Vector3)?.x,
    Array.isArray(position) ? position[1] : (position as THREE.Vector3)?.y,
    Array.isArray(position) ? position[2] : (position as THREE.Vector3)?.z,
    Array.isArray(rotation) ? rotation[0] : (rotation as THREE.Euler)?.x,
    Array.isArray(rotation) ? rotation[1] : (rotation as THREE.Euler)?.y,
    Array.isArray(rotation) ? rotation[2] : (rotation as THREE.Euler)?.z,
    scale,
  ])

  useEffect(() => {
    if (!model || !isTranslucent) return

    const originalMaterials: {
      mesh: THREE.Mesh
      material: THREE.Material | THREE.Material[]
    }[] = []

    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        // Save original material(s)
        originalMaterials.push({ mesh: child, material: child.material })

        // Clone to avoid mutating shared materials
        const makeTransparent = (mat: THREE.Material) => {
          const clone = mat.clone()
          clone.transparent = true
          clone.opacity = 0.5
          clone.depthWrite = false
          clone.needsUpdate = true
          return clone
        }

        if (Array.isArray(child.material)) {
          child.material = child.material.map(makeTransparent)
        } else {
          child.material = makeTransparent(child.material)
        }
      }
    })

    // Cleanup — restore original materials
    return () => {
      originalMaterials.forEach(({ mesh, material }) => {
        mesh.material = material
      })
    }
  }, [model, isTranslucent])

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
