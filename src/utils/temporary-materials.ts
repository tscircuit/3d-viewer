import type * as THREE from "three"

// Resource owners must see their original materials before disposing a model.
// Weak keys avoid retaining meshes removed before an override is released.
const restorations = new WeakMap<THREE.Object3D, () => void>()

export function registerMaterialRestoration(
  object: THREE.Object3D,
  restore: () => void,
) {
  restorations.set(object, restore)
  return () => restorations.delete(object)
}

export function restoreTemporaryMaterials(root: THREE.Object3D) {
  root.traverse((object) => restorations.get(object)?.())
}
