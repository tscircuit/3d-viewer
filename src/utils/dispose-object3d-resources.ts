import * as THREE from "three"

const MATERIAL_TEXTURE_KEYS = [
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
] as const

function disposeMaterial(material: THREE.Material) {
  for (const key of MATERIAL_TEXTURE_KEYS) {
    const texture = material[key as keyof THREE.Material]
    if (texture instanceof THREE.Texture) {
      texture.dispose()
    }
  }

  material.dispose()
}

export function disposeObject3DResources(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    child.geometry.dispose()

    if (Array.isArray(child.material)) {
      child.material.forEach(disposeMaterial)
    } else {
      disposeMaterial(child.material)
    }
  })
}
