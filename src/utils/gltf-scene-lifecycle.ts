import * as THREE from "three"

export function applyGltfSceneMaterialState(
  scene: THREE.Object3D,
  { isTranslucent }: { isTranslucent: boolean },
) {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return

    const setMaterialTransparency = (material: THREE.Material) => {
      material.transparent = isTranslucent
      material.opacity = isTranslucent ? 0.5 : 1
      material.depthWrite = !isTranslucent
      material.needsUpdate = true
    }

    if (Array.isArray(child.material)) {
      child.material.forEach(setMaterialTransparency)
    } else {
      setMaterialTransparency(child.material)
    }

    child.renderOrder = isTranslucent ? 2 : 1
  })
}

export function disposeGltfSceneResources(scene: THREE.Object3D) {
  const disposedGeometries = new Set<THREE.BufferGeometry>()
  const disposedMaterials = new Set<THREE.Material>()
  const disposedTextures = new Set<THREE.Texture>()

  const disposeTexture = (texture: THREE.Texture) => {
    if (disposedTextures.has(texture)) return
    disposedTextures.add(texture)
    texture.dispose()
  }

  const disposeMaterial = (material: THREE.Material) => {
    if (disposedMaterials.has(material)) return
    disposedMaterials.add(material)

    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) {
        disposeTexture(value)
      }
    }

    material.dispose()
  }

  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    if (child.geometry && !disposedGeometries.has(child.geometry)) {
      disposedGeometries.add(child.geometry)
      child.geometry.dispose()
    }

    if (Array.isArray(child.material)) {
      child.material.forEach(disposeMaterial)
    } else if (child.material) {
      disposeMaterial(child.material)
    }
  })
}
