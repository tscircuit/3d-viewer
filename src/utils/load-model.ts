import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

export type ModelFormat = "stl" | "obj" | "wrl" | "gltf" | "glb"

type CachedModel = {
  promise: Promise<THREE.Object3D>
  result: THREE.Object3D | null
}

const modelCache = new Map<string, CachedModel>()
const CACHE_BUSTING_QUERY_PARAMS = ["cachebust_origin"]

function cloneMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    return material.map((mat) => mat.clone())
  }

  return material.clone()
}

function cloneModelInstance(template: THREE.Object3D) {
  const clone = template.clone(true)

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    if (child.geometry) {
      child.geometry = child.geometry.clone()
    }

    if (child.material) {
      child.material = cloneMaterial(child.material)
    }
  })

  return clone
}

function getPathnameForFormatDetection(url: string) {
  try {
    return new URL(url, "https://model.local").pathname.toLowerCase()
  } catch {
    return url.split(/[?#]/, 1)[0]?.toLowerCase() ?? ""
  }
}

function normalizeUrlForCache(url: string) {
  try {
    const parsed = new URL(url, "https://model.local")
    for (const param of CACHE_BUSTING_QUERY_PARAMS) {
      parsed.searchParams.delete(param)
    }
    parsed.searchParams.sort()
    parsed.hash = ""

    if (!/^[a-z][a-z\d+.-]*:/i.test(url)) {
      return `${parsed.pathname}${parsed.search}`
    }

    return parsed.toString()
  } catch {
    const withoutHash = url.split("#", 1)[0] ?? ""
    const [path, query = ""] = withoutHash.split("?", 2)
    if (!query) return path

    const params = new URLSearchParams(query)
    for (const param of CACHE_BUSTING_QUERY_PARAMS) {
      params.delete(param)
    }
    params.sort()
    const normalizedQuery = params.toString()
    return normalizedQuery ? `${path}?${normalizedQuery}` : path
  }
}

function inferModelFormat(url: string): ModelFormat | null {
  const pathname = getPathnameForFormatDetection(url)

  if (pathname.endsWith(".stl")) return "stl"
  if (pathname.endsWith(".obj")) return "obj"
  if (pathname.endsWith(".wrl")) return "wrl"
  if (pathname.endsWith(".gltf")) return "gltf"
  if (pathname.endsWith(".glb")) return "glb"

  return null
}

function getCacheKey(url: string, format: ModelFormat) {
  return `${format}:${normalizeUrlForCache(url)}`
}

async function loadModelTemplate(url: string, format: ModelFormat) {
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

  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(url)
  return gltf.scene
}

export function clear3DModelCache() {
  modelCache.clear()
}

export async function load3DModel(
  url: string,
  explicitFormat?: ModelFormat,
): Promise<THREE.Object3D | null> {
  const format = explicitFormat ?? inferModelFormat(url)

  if (!format) {
    console.error("Unsupported file format or failed to load 3D model.")
    return null
  }

  const cacheKey = getCacheKey(url, format)
  const cached = modelCache.get(cacheKey)

  if (cached?.result) {
    return cloneModelInstance(cached.result)
  }

  if (cached) {
    const template = await cached.promise
    return cloneModelInstance(template)
  }

  const promise = loadModelTemplate(url, format)
  modelCache.set(cacheKey, { promise, result: null })

  try {
    const template = await promise
    modelCache.set(cacheKey, { promise, result: template })
    return cloneModelInstance(template)
  } catch (error) {
    modelCache.delete(cacheKey)
    throw error
  }
}
