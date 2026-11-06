import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

type CachedModel = {
  promise: Promise<THREE.Object3D | null>
  result: THREE.Object3D | null
}

const modelCache = new Map<string, CachedModel>()

export const getModelExtensionFromUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url, "https://model.local")
    return parsedUrl.pathname.split(".").pop()?.toLowerCase() ?? ""
  } catch {
    return url.split(/[?#]/)[0]?.split(".").pop()?.toLowerCase() ?? ""
  }
}

export const getModelCacheKey = (url: string): string => {
  try {
    const parsedUrl = new URL(url, "https://model.local")
    parsedUrl.searchParams.delete("cachebust_origin")
    return parsedUrl.href.replace("https://model.local/", "")
  } catch {
    return url
      .replace(/([?&])cachebust_origin=[^&#]*&?/g, "$1")
      .replace(/[?&]$/, "")
  }
}

export const cloneModelForUse = (model: THREE.Object3D): THREE.Object3D => {
  const clone = model.clone(true)
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    child.geometry = child.geometry.clone()
    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone())
    } else if (child.material) {
      child.material = child.material.clone()
    }
  })
  return clone
}

export const clearModelCacheForTests = () => {
  modelCache.clear()
}

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  const cacheKey = getModelCacheKey(url)
  const cached = modelCache.get(cacheKey)
  if (cached?.result) return cloneModelForUse(cached.result)
  if (cached) {
    const model = await cached.promise
    return model ? cloneModelForUse(model) : null
  }

  const promise = load3DModelUncached(url)
  modelCache.set(cacheKey, { promise, result: null })

  try {
    const model = await promise
    modelCache.set(cacheKey, { promise, result: model })
    return model ? cloneModelForUse(model) : null
  } catch (error) {
    modelCache.delete(cacheKey)
    throw error
  }
}

async function load3DModelUncached(
  url: string,
): Promise<THREE.Object3D | null> {
  const extension = getModelExtensionFromUrl(url)

  if (extension === "stl") {
    const loader = new STLLoader()
    const geometry = await loader.loadAsync(url)
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.5,
      roughness: 0.5,
    })
    return new THREE.Mesh(geometry, material)
  }

  if (extension === "obj") {
    const loader = new OBJLoader()
    return await loader.loadAsync(url)
  }

  if (extension === "wrl") {
    return await loadVrml(url)
  }

  if (extension === "gltf" || extension === "glb") {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)
    return gltf.scene
  }

  console.error("Unsupported file format or failed to load 3D model.")
  return null
}
