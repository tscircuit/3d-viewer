import * as THREE from "three"

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    for (const entry of material) {
      entry.dispose()
    }
    return
  }

  material.dispose()
}

export function disposeThreeObjectResources(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    child.geometry?.dispose()

    if (child.material) {
      disposeMaterial(child.material)
    }
  })
}
