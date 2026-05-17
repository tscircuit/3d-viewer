import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

export type CachedModel = {
  promise: Promise<THREE.Object3D | null>
  result: THREE.Object3D | null
}

export type LoadModelImplementation = (
  url: string,
  extension: string | null,
) => Promise<THREE.Object3D | null>

export type Load3DModelOptions = {
  cache?: Map<string, CachedModel>
  loadModel?: LoadModelImplementation
}

const sharedModelCache = new Map<string, CachedModel>()

export function getModelFileExtension(url: string): string | null {
  const pathWithoutHash = url.split("#", 1)[0] ?? url
  const pathWithoutQuery = pathWithoutHash.split("?", 1)[0] ?? pathWithoutHash
  const match = pathWithoutQuery.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? null
}

export function normalizeModelUrlForCache(url: string): string {
  const [beforeHash, ...hashParts] = url.split("#")
  const hash = hashParts.length > 0 ? `#${hashParts.join("#")}` : ""
  const [path, ...queryParts] = (beforeHash ?? url).split("?")
  const query = queryParts.join("?")

  if (!query) {
    return url
  }

  const keptQueryParts = query
    .split("&")
    .filter((part) => {
      const [rawKey = ""] = part.split("=", 1)
      try {
        return decodeURIComponent(rawKey) !== "cachebust_origin"
      } catch {
        return rawKey !== "cachebust_origin"
      }
    })
    .filter(Boolean)

  return `${path}${keptQueryParts.length > 0 ? `?${keptQueryParts.join("&")}` : ""}${hash}`
}

export function cloneLoadedModel(model: THREE.Object3D): THREE.Object3D {
  const clone = model.clone(true)

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone())
    } else {
      child.material = child.material.clone()
    }
  })

  return clone
}

async function load3DModelUncached(
  url: string,
  extension: string | null,
): Promise<THREE.Object3D | null> {
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

async function cloneCachedModel(cacheItem: CachedModel) {
  const model = cacheItem.result ?? (await cacheItem.promise)
  return model ? cloneLoadedModel(model) : null
}

export async function load3DModel(
  url: string,
  options: Load3DModelOptions = {},
): Promise<THREE.Object3D | null> {
  const cache = options.cache ?? sharedModelCache
  const loadModel = options.loadModel ?? load3DModelUncached
  const cacheKey = normalizeModelUrlForCache(url)
  const extension = getModelFileExtension(url)
  const cachedModel = cache.get(cacheKey)

  if (cachedModel) {
    return cloneCachedModel(cachedModel)
  }

  const cacheItem: CachedModel = {
    promise: loadModel(url, extension),
    result: null,
  }
  cache.set(cacheKey, cacheItem)

  try {
    const model = await cacheItem.promise
    cacheItem.result = model
    return model ? cloneLoadedModel(model) : null
  } catch (error) {
    if (cache.get(cacheKey) === cacheItem) {
      cache.delete(cacheKey)
    }
    throw error
  }
}
