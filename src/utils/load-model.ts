import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

export type ModelType = "stl" | "obj" | "wrl" | "gltf" | "glb"

type ModelLoaders = {
  stl: (url: string) => Promise<THREE.BufferGeometry>
  obj: (url: string) => Promise<THREE.Object3D>
  wrl: (url: string) => Promise<THREE.Object3D | null>
  gltf: (url: string) => Promise<THREE.Object3D>
}

type ModelCacheEntry = {
  promise: Promise<THREE.Object3D | null>
  result: THREE.Object3D | null
}

const loadedModelCache = new Map<string, ModelCacheEntry>()

export function normalizeModelCacheKey(url: string) {
  try {
    const parsedUrl = new URL(url, "https://model-cache.local")
    parsedUrl.searchParams.delete("cachebust_origin")
    parsedUrl.hash = ""
    const sortedParams = Array.from(parsedUrl.searchParams.entries()).sort(
      ([leftKey, leftValue], [rightKey, rightValue]) =>
        leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
    )
    parsedUrl.search = ""
    for (const [key, value] of sortedParams) {
      parsedUrl.searchParams.append(key, value)
    }

    if (parsedUrl.origin === "https://model-cache.local") {
      return `${parsedUrl.pathname}${parsedUrl.search}`
    }

    return parsedUrl.toString()
  } catch {
    return url
      .replace(/([?&])cachebust_origin=[^&]*&?/g, "$1")
      .replace(/[?&]$/, "")
  }
}

export function getModelTypeFromUrl(
  url: string,
  modelType?: ModelType,
): ModelType | null {
  if (modelType) return modelType

  const extension = (() => {
    try {
      const parsedUrl = new URL(url, "https://model-type.local")
      const match = parsedUrl.pathname.toLowerCase().match(/\.([a-z0-9]+)$/)
      return match?.[1]
    } catch {
      return url
        .toLowerCase()
        .split("?")[0]
        ?.match(/\.([a-z0-9]+)$/)?.[1]
    }
  })()

  if (
    extension === "stl" ||
    extension === "obj" ||
    extension === "wrl" ||
    extension === "gltf" ||
    extension === "glb"
  ) {
    return extension
  }

  return null
}

export function cloneModelInstance(model: THREE.Object3D) {
  const clone = model.clone(true)

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone())
    } else if (child.material) {
      child.material = child.material.clone()
    }
  })

  return clone
}

export function clearLoadedModelCacheForTests() {
  loadedModelCache.clear()
}

const defaultModelLoaders: ModelLoaders = {
  stl: async (url) => {
    const loader = new STLLoader()
    return await loader.loadAsync(url)
  },
  obj: async (url) => {
    const loader = new OBJLoader()
    return await loader.loadAsync(url)
  },
  wrl: loadVrml,
  gltf: async (url) => {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)
    return gltf.scene
  },
}

export async function load3DModelWithLoaders(
  url: string,
  modelType: ModelType | undefined,
  loaders: ModelLoaders,
): Promise<THREE.Object3D | null> {
  const detectedModelType = getModelTypeFromUrl(url, modelType)

  if (!detectedModelType) {
    console.error("Unsupported file format or failed to load 3D model.")
    return null
  }

  const cacheKey = `${detectedModelType}:${normalizeModelCacheKey(url)}`
  const cached = loadedModelCache.get(cacheKey)

  if (cached) {
    const cachedModel = cached.result ?? (await cached.promise)
    return cachedModel ? cloneModelInstance(cachedModel) : null
  }

  const promise = (async () => {
    if (detectedModelType === "stl") {
      const geometry = await loaders.stl(url)
      const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.5,
        roughness: 0.5,
      })
      return new THREE.Mesh(geometry, material)
    }

    if (detectedModelType === "obj") {
      return await loaders.obj(url)
    }

    if (detectedModelType === "wrl") {
      return await loaders.wrl(url)
    }

    return await loaders.gltf(url)
  })()

  loadedModelCache.set(cacheKey, { promise, result: null })

  try {
    const model = await promise
    loadedModelCache.set(cacheKey, { promise, result: model })
    return model ? cloneModelInstance(model) : null
  } catch (error) {
    loadedModelCache.delete(cacheKey)
    throw error
  }
}

export async function load3DModel(
  url: string,
  modelType?: ModelType,
): Promise<THREE.Object3D | null> {
  return await load3DModelWithLoaders(url, modelType, defaultModelLoaders)
}
