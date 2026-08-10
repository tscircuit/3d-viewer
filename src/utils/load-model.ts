import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

export type ModelFileFormat = "stl" | "obj" | "wrl" | "gltf" | "glb"

type LoadModelTemplate = (
  url: string,
  format: ModelFileFormat,
) => Promise<THREE.Object3D | null>

type Load3DModelOptions = {
  modelFormat?: ModelFileFormat
  loadModel?: LoadModelTemplate
}

const modelCache = new Map<string, Promise<THREE.Object3D | null>>()

export function clear3DModelCache() {
  modelCache.clear()
}

export function getModelFileFormat(url: string): ModelFileFormat | null {
  const path = getUrlPathname(url).toLowerCase()
  const extension = path.match(/\.([^./]+)$/)?.[1]

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

export function normalizeModelCacheKey(url: string): string {
  try {
    const parsed = new URL(url, "https://tscircuit.local")
    parsed.searchParams.delete("cachebust_origin")

    if (parsed.origin === "https://tscircuit.local") {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }

    return parsed.toString()
  } catch {
    return url.replace(/([?&])cachebust_origin=[^&#]*&?/g, (_, prefix) =>
      prefix === "?" ? "?" : "",
    )
  }
}

export function cloneObject3DWithIndependentMaterials(
  object: THREE.Object3D,
): THREE.Object3D {
  const clone = object.clone(true)

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return

    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone()
  })

  return clone
}

export async function load3DModel(
  url: string,
  options: Load3DModelOptions = {},
): Promise<THREE.Object3D | null> {
  const format = options.modelFormat ?? getModelFileFormat(url)

  if (!format) {
    console.error("Unsupported file format or failed to load 3D model.")
    return null
  }

  const loadModel = options.loadModel ?? loadFreshModelTemplate
  const cacheKey = `${format}:${normalizeModelCacheKey(url)}`
  let cachedTemplate = modelCache.get(cacheKey)

  if (!cachedTemplate) {
    let templatePromise: Promise<THREE.Object3D | null>
    templatePromise = loadModel(url, format)
      .then((model) => {
        if (!model) {
          if (modelCache.get(cacheKey) === templatePromise) {
            modelCache.delete(cacheKey)
          }
          return null
        }

        return model
      })
      .catch((error) => {
        if (modelCache.get(cacheKey) === templatePromise) {
          modelCache.delete(cacheKey)
        }
        throw error
      })

    modelCache.set(cacheKey, templatePromise)
    cachedTemplate = templatePromise
  }

  const template = await cachedTemplate
  return template ? cloneObject3DWithIndependentMaterials(template) : null
}

function getUrlPathname(url: string): string {
  try {
    return new URL(url, "https://tscircuit.local").pathname
  } catch {
    return url.split(/[?#]/)[0] ?? url
  }
}

async function loadFreshModelTemplate(
  url: string,
  format: ModelFileFormat,
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
