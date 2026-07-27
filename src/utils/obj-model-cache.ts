import * as THREE from "three"

const CACHEBUST_PARAM = "cachebust_origin"

export function getObjModelCacheKey(modelUrl: string): string {
  try {
    const url = new URL(modelUrl, "https://tscircuit.local")
    url.searchParams.delete(CACHEBUST_PARAM)

    if (!/^[a-z][a-z\d+.-]*:/i.test(modelUrl) || modelUrl.startsWith(".")) {
      return `${url.pathname}${url.search}${url.hash}`
    }

    return url.toString()
  } catch {
    return modelUrl
      .replace(new RegExp(`([?&])${CACHEBUST_PARAM}=[^&#]*&?`), "$1")
      .replace(/[?&]$/, "")
  }
}

export function cloneObjModelForScene(model: THREE.Object3D): THREE.Object3D {
  const clone = model.clone(true)
  const materialCloneCache = new Map<THREE.Material, THREE.Material>()

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return

    const cloneMaterial = (material: THREE.Material) => {
      let clonedMaterial = materialCloneCache.get(material)
      if (!clonedMaterial) {
        clonedMaterial = material.clone()
        materialCloneCache.set(material, clonedMaterial)
      }
      return clonedMaterial
    }

    child.material = Array.isArray(child.material)
      ? child.material.map(cloneMaterial)
      : cloneMaterial(child.material)
  })

  return clone
}
