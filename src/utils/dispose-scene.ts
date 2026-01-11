import * as THREE from "three"

export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose()
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => disposeMaterial(material))
        } else {
          disposeMaterial(child.material)
        }
      }
    }

    if (child instanceof THREE.Line) {
      if (child.geometry) {
        child.geometry.dispose()
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => disposeMaterial(material))
        } else {
          disposeMaterial(child.material)
        }
      }
    }

    if (child instanceof THREE.Points) {
      if (child.geometry) {
        child.geometry.dispose()
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => disposeMaterial(material))
        } else {
          disposeMaterial(child.material)
        }
      }
    }
  })
}
function disposeMaterial(material: THREE.Material): void {
  const textureProperties = [
    "map",
    "lightMap",
    "bumpMap",
    "normalMap",
    "specularMap",
    "envMap",
    "alphaMap",
    "aoMap",
    "displacementMap",
    "emissiveMap",
    "gradientMap",
    "metalnessMap",
    "roughnessMap",
  ]

  for (const prop of textureProperties) {
    const texture = (material as any)[prop]
    if (texture instanceof THREE.Texture) {
      texture.dispose()
    }
  }

  material.dispose()
}

export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((child) => {
    if (child !== scene) {
      disposeObject3D(child)
    }
  })
  scene.clear()
}
export function disposeRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.dispose()
  renderer.forceContextLoss()
}
