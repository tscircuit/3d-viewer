import * as THREE from "three"

export function cloneObject3DWithMaterials<T extends THREE.Object3D>(
  object: T,
): T {
  const clone = object.clone(true) as T

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone())
    } else if (child.material) {
      child.material = child.material.clone()
    }
  })

  return clone
}
