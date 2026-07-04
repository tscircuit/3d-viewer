import * as THREE from "three"

function disposeMaterialTextures(
  material: THREE.Material,
  disposedTextures: Set<THREE.Texture>,
) {
  for (const [key, value] of Object.entries(material)) {
    if (key === "envMap") continue
    if (value && typeof value === "object" && "isTexture" in value) {
      const texture = value as THREE.Texture
      if (texture.isTexture && !disposedTextures.has(texture)) {
        texture.dispose()
        disposedTextures.add(texture)
      }
    }
  }
}

export function disposeObject3DResources(object: THREE.Object3D) {
  const disposedGeometries = new Set<THREE.BufferGeometry>()
  const disposedMaterials = new Set<THREE.Material>()
  const disposedTextures = new Set<THREE.Texture>()

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    const geometry = child.geometry
    if (geometry && !disposedGeometries.has(geometry)) {
      geometry.dispose()
      disposedGeometries.add(geometry)
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material]

    for (const material of materials) {
      if (!material || disposedMaterials.has(material)) continue
      disposeMaterialTextures(material, disposedTextures)
      material.dispose()
      disposedMaterials.add(material)
    }
  })
}
