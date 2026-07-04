import * as THREE from "three"

export function disposeObject3DResources(object: THREE.Object3D): void {
  const disposedGeometries = new Set<THREE.BufferGeometry>()
  const disposedMaterials = new Set<THREE.Material>()
  const disposedTextures = new Set<THREE.Texture>()

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    if (child.geometry && !disposedGeometries.has(child.geometry)) {
      child.geometry.dispose()
      disposedGeometries.add(child.geometry)
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material]

    for (const material of materials) {
      if (!material || disposedMaterials.has(material)) continue

      for (const [key, value] of Object.entries(material)) {
        if (key === "envMap") continue
        if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
          value.dispose()
          disposedTextures.add(value)
        }
      }

      material.dispose()
      disposedMaterials.add(material)
    }
  })
}
