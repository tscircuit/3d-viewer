import * as THREE from "three"

const disposeMaterial = (material: THREE.Material) => {
  material.dispose()
}

export const disposeOwnedObjectResources = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    child.geometry?.dispose()

    if (Array.isArray(child.material)) {
      child.material.forEach(disposeMaterial)
    } else if (child.material) {
      disposeMaterial(child.material)
    }
  })
}
