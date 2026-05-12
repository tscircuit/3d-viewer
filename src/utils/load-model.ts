import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

const MODEL_CACHEBUST_PARAM = "cachebust_origin"
const modelLoadCache = new Map<string, Promise<THREE.Object3D | null>>()
type ModelExtension = "stl" | "obj" | "wrl" | "gltf" | "glb"

function isAbsoluteUrl(url: string) {
  return /^[a-z][a-z\d+\-.]*:/i.test(url)
}

export function getModelExtension(url: string): string | null {
  try {
    const parsed = new URL(url, "https://tscircuit.local")
    const match = parsed.pathname.toLowerCase().match(/\.([a-z0-9]+)$/)
    return match?.[1] ?? null
  } catch {
    const pathname = url.split(/[?#]/, 1)[0]?.toLowerCase() ?? ""
    const match = pathname.match(/\.([a-z0-9]+)$/)
    return match?.[1] ?? null
  }
}

export function normalizeModelCacheKey(url: string): string {
  try {
    const absolute = isAbsoluteUrl(url)
    const rootRelative = url.startsWith("/")
    const parsed = new URL(url, "https://tscircuit.local")
    parsed.searchParams.delete(MODEL_CACHEBUST_PARAM)

    if (absolute) return parsed.toString()

    const relativeUrl = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return rootRelative ? relativeUrl : relativeUrl.replace(/^\//, "")
  } catch {
    return url
      .replace(new RegExp(`([?&])${MODEL_CACHEBUST_PARAM}=[^&#]*&?`), "$1")
      .replace(/[?&]$/, "")
  }
}

export function cloneModelForUse(model: THREE.Object3D): THREE.Object3D {
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

export async function load3DModel(
  url: string,
  fallbackExtension?: ModelExtension,
): Promise<THREE.Object3D | null> {
  const extension = getModelExtension(url) ?? fallbackExtension
  const cacheKey = `${normalizeModelCacheKey(url)}#${extension ?? "unknown"}`
  let modelPromise = modelLoadCache.get(cacheKey)

  if (!modelPromise) {
    modelPromise = load3DModelUncached(url, extension).catch((error) => {
      modelLoadCache.delete(cacheKey)
      throw error
    })
    modelLoadCache.set(cacheKey, modelPromise)
  }

  const model = await modelPromise
  return model ? cloneModelForUse(model) : null
}

async function load3DModelUncached(
  url: string,
  extension: string | null | undefined,
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
