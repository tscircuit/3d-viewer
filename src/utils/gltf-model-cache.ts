import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"

type GltfCacheItem = {
  promise: Promise<THREE.Group>
  scene: THREE.Group | null
}

declare global {
  interface Window {
    TSCIRCUIT_GLTF_LOADER_CACHE?: Map<string, GltfCacheItem>
  }
}

const moduleCache = new Map<string, GltfCacheItem>()

const getGltfCache = () => {
  if (typeof window === "undefined") return moduleCache
  window.TSCIRCUIT_GLTF_LOADER_CACHE ??= new Map<string, GltfCacheItem>()
  return window.TSCIRCUIT_GLTF_LOADER_CACHE
}

export const normalizeGltfModelCacheKey = (url: string) => {
  try {
    const parsedUrl = new URL(url, "https://cache-key.tscircuit.local")
    parsedUrl.searchParams.delete("cachebust_origin")
    const normalizedPath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return `${parsedUrl.origin}${normalizedPath}`
    }

    return normalizedPath
  } catch {
    return url
      .replace(/([?&])cachebust_origin=[^&]*&?/g, "$1")
      .replace(/[?&]$/, "")
  }
}

export const cloneSceneWithIndependentMaterials = <T extends THREE.Object3D>(
  scene: T,
): T => {
  const clone = scene.clone(true)

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return

    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone()
  })

  return clone
}

export async function loadCachedGltfScene(
  gltfUrl: string,
): Promise<THREE.Group> {
  const cacheKey = normalizeGltfModelCacheKey(gltfUrl)
  const cache = getGltfCache()
  const cached = cache.get(cacheKey)

  if (cached?.scene) {
    return cloneSceneWithIndependentMaterials(cached.scene)
  }

  if (cached) {
    const scene = await cached.promise
    return cloneSceneWithIndependentMaterials(scene)
  }

  const loader = new GLTFLoader()
  const promise = loader
    .loadAsync(gltfUrl)
    .then((gltf) => {
      cache.set(cacheKey, { promise, scene: gltf.scene })
      return gltf.scene
    })
    .catch((error) => {
      cache.delete(cacheKey)
      throw error
    })

  cache.set(cacheKey, { promise, scene: null })

  const scene = await promise
  return cloneSceneWithIndependentMaterials(scene)
}
