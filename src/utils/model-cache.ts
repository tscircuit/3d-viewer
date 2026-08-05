import * as THREE from "three"

type ModelCacheItem = {
  promise: Promise<THREE.Object3D>
  result?: THREE.Object3D
}

const MODEL_CACHE_KEY = "__TSCIRCUIT_3D_VIEWER_MODEL_CACHE__"
const MODEL_CACHE_BASE_URL = "https://model-cache.local"

type GlobalModelCacheScope = typeof globalThis & {
  [MODEL_CACHE_KEY]?: Map<string, ModelCacheItem>
}

export function normalizeModelCacheUrl(url: string): string {
  try {
    const parsed = new URL(url, MODEL_CACHE_BASE_URL)
    parsed.searchParams.delete("cachebust_origin")

    if (parsed.origin === MODEL_CACHE_BASE_URL) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }

    return parsed.toString()
  } catch {
    return url
  }
}

function getModelCache(): Map<string, ModelCacheItem> {
  const scope = globalThis as GlobalModelCacheScope
  if (!scope[MODEL_CACHE_KEY]) {
    scope[MODEL_CACHE_KEY] = new Map()
  }
  return scope[MODEL_CACHE_KEY]
}

function cloneMaterial(material: THREE.Material): THREE.Material {
  return material.clone()
}

export function cloneObject3D(source: THREE.Object3D): THREE.Object3D {
  const cloned = source.clone(true)

  cloned.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return

    child.material = Array.isArray(child.material)
      ? child.material.map(cloneMaterial)
      : cloneMaterial(child.material)
  })

  return cloned
}

export async function loadCachedModel(
  url: string,
  loadModel: (normalizedUrl: string) => Promise<THREE.Object3D>,
): Promise<THREE.Object3D> {
  const normalizedUrl = normalizeModelCacheUrl(url)
  const cache = getModelCache()
  const cached = cache.get(normalizedUrl)

  if (cached?.result) {
    return cloneObject3D(cached.result)
  }

  if (cached) {
    const result = await cached.promise
    return cloneObject3D(result)
  }

  const promise = loadModel(normalizedUrl).then(
    (result) => {
      cache.set(normalizedUrl, { promise: Promise.resolve(result), result })
      return result
    },
    (error) => {
      cache.delete(normalizedUrl)
      throw error
    },
  )

  cache.set(normalizedUrl, { promise })

  const result = await promise
  return cloneObject3D(result)
}
