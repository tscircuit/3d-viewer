import * as THREE from "three"

const textureProperties = [
  "map",
  "alphaMap",
  "aoMap",
  "bumpMap",
  "displacementMap",
  "emissiveMap",
  "envMap",
  "lightMap",
  "metalnessMap",
  "normalMap",
  "roughnessMap",
  "specularMap",
] as const

type TextureProperty = (typeof textureProperties)[number]

export function disposeObject3D(object: THREE.Object3D) {
  const disposedGeometries = new Set<THREE.BufferGeometry>()
  const disposedMaterials = new Set<THREE.Material>()
  const disposedTextures = new Set<THREE.Texture>()

  object.traverse((child) => {
    const geometry = (child as THREE.Mesh).geometry
    if (geometry instanceof THREE.BufferGeometry) {
      disposeGeometryOnce(geometry, disposedGeometries)
    }

    const material = (child as THREE.Mesh).material
    if (Array.isArray(material)) {
      for (const singleMaterial of material) {
        disposeMaterialOnce(singleMaterial, disposedMaterials, disposedTextures)
      }
    } else if (material instanceof THREE.Material) {
      disposeMaterialOnce(material, disposedMaterials, disposedTextures)
    }
  })

  object.clear()
}

function disposeGeometryOnce(
  geometry: THREE.BufferGeometry,
  disposedGeometries: Set<THREE.BufferGeometry>,
) {
  if (disposedGeometries.has(geometry)) return
  disposedGeometries.add(geometry)
  geometry.dispose()
}

function disposeMaterialOnce(
  material: THREE.Material,
  disposedMaterials: Set<THREE.Material>,
  disposedTextures: Set<THREE.Texture>,
) {
  if (disposedMaterials.has(material)) return
  disposedMaterials.add(material)

  const materialWithTextures = material as THREE.Material &
    Partial<Record<TextureProperty, THREE.Texture | null>>

  for (const property of textureProperties) {
    const texture = materialWithTextures[property]
    if (!(texture instanceof THREE.Texture) || disposedTextures.has(texture)) {
      continue
    }

    disposedTextures.add(texture)
    texture.dispose()
    materialWithTextures[property] = null
  }

  material.dispose()
}
