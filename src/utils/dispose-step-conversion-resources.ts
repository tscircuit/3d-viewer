import * as THREE from "three"

export function disposeStepConversionResources(group: THREE.Group): void {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    child.geometry.dispose()

    if (Array.isArray(child.material)) {
      for (const material of child.material) {
        material.dispose()
      }
    } else {
      child.material.dispose()
    }
  })
}
