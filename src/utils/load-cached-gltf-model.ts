import { GLTFLoader } from "three-stdlib"
import * as THREE from "three"
import { getModelCacheKey } from "src/utils/model-url-cache-key"

interface GltfCacheItem {
  promise: Promise<THREE.Group | Error>
  result: THREE.Group | null
}

declare global {
  interface Window {
    TSCIRCUIT_GLTF_LOADER_CACHE: Map<string, GltfCacheItem>
  }
}

function cloneMaterial(material: THREE.Material): THREE.Material {
  return material.clone()
}

export function cloneModelForInstance(model: THREE.Group): THREE.Group {
  const cloned = model.clone(true)

  cloned.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return

    if (Array.isArray(child.material)) {
      child.material = child.material.map(cloneMaterial)
    } else {
      child.material = cloneMaterial(child.material)
    }
  })

  return cloned
}

function getGltfCache(): Map<string, GltfCacheItem> {
  if (!window.TSCIRCUIT_GLTF_LOADER_CACHE) {
    window.TSCIRCUIT_GLTF_LOADER_CACHE = new Map<string, GltfCacheItem>()
  }

  return window.TSCIRCUIT_GLTF_LOADER_CACHE
}

function loadGltfScene(url: string): Promise<THREE.Group | Error> {
  return new Promise((resolve) => {
    const loader = new GLTFLoader()

    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (error) => {
        console.error(`An error happened loading ${url}`, error)
        resolve(
          error instanceof Error
            ? error
            : new Error(`Failed to load glTF model from ${url}`),
        )
      },
    )
  })
}

export async function loadCachedGltfModel(
  url: string,
): Promise<THREE.Group | Error> {
  const cacheKey = getModelCacheKey(url)
  const cache = getGltfCache()
  const cached = cache.get(cacheKey)

  if (cached) {
    const result = cached.result ?? (await cached.promise)
    if (result instanceof Error) return result
    return cloneModelForInstance(result)
  }

  const promise = loadGltfScene(cacheKey)
  cache.set(cacheKey, { promise, result: null })

  const result = await promise
  if (result instanceof Error) return result

  cache.set(cacheKey, { promise, result })
  return cloneModelForInstance(result)
}
