import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

export type SupportedModelFormat = "stl" | "obj" | "wrl" | "gltf" | "glb"

interface CachedModelLoad {
  promise: Promise<THREE.Object3D | null>
  result: THREE.Object3D | null
}

const modelCache = new Map<string, CachedModelLoad>()

export function getModelCacheKey(url: string): string {
  try {
    const parsed = new URL(url, "https://tscircuit.invalid")
    parsed.searchParams.delete("cachebust_origin")
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return url.startsWith("http://") || url.startsWith("https://")
      ? parsed.toString()
      : normalized
  } catch {
    return url
      .replace(/([?&])cachebust_origin=[^&#]*&?/g, "$1")
      .replace(/[?&]$/, "")
  }
}

export function getModelFormat(
  url: string,
  explicitFormat?: SupportedModelFormat,
): SupportedModelFormat | null {
  if (explicitFormat) return explicitFormat

  try {
    const pathname = new URL(url, "https://tscircuit.invalid").pathname
    const match = pathname.toLowerCase().match(/\.([a-z0-9]+)$/)
    const extension = match?.[1]
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
  } catch {
    const match = url
      .toLowerCase()
      .split(/[?#]/)[0]
      ?.match(/\.([a-z0-9]+)$/)
    const extension = match?.[1]
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
}

function cloneModel(model: THREE.Object3D): THREE.Object3D {
  const clone = model.clone(true)

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return

    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone()
  })

  return clone
}

async function load3DModelUncached(
  url: string,
  format: SupportedModelFormat,
): Promise<THREE.Object3D | null> {
  if (format === "stl") {
    const loader = new STLLoader()
    const geometry = await loader.loadAsync(url)
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.5,
      roughness: 0.5,
    })
    return new THREE.Mesh(geometry, material)
  }

  if (format === "obj") {
    const loader = new OBJLoader()
    return await loader.loadAsync(url)
  }

  if (format === "wrl") {
    return await loadVrml(url)
  }

  if (format === "gltf" || format === "glb") {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)
    return gltf.scene
  }

  return null
}

export async function load3DModel(
  url: string,
  explicitFormat?: SupportedModelFormat,
): Promise<THREE.Object3D | null> {
  const format = getModelFormat(url, explicitFormat)
  if (!format) {
    console.error("Unsupported file format or failed to load 3D model.")
    return null
  }

  const cacheKey = `${format}:${getModelCacheKey(url)}`
  const cached = modelCache.get(cacheKey)
  if (cached) {
    if (cached.result) return cloneModel(cached.result)
    const result = await cached.promise
    return result ? cloneModel(result) : null
  }

  const promise = load3DModelUncached(url, format)
    .then((result) => {
      if (!result) {
        modelCache.delete(cacheKey)
        return null
      }
      const cachedLoad = modelCache.get(cacheKey)
      if (cachedLoad) cachedLoad.result = result
      return result
    })
    .catch((error) => {
      modelCache.delete(cacheKey)
      throw error
    })

  modelCache.set(cacheKey, { promise, result: null })
  const result = await promise
  return result ? cloneModel(result) : null
}
