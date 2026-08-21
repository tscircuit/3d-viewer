import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

const modelCache = new Map<string, Promise<THREE.Object3D | null>>()

export function getModelCacheKey(url: string): string {
  try {
    const isAbsoluteUrl = /^[a-z][a-z\d+\-.]*:\/\//i.test(url)
    const parsedUrl = new URL(url, "https://cache-key.invalid")
    parsedUrl.searchParams.delete("cachebust_origin")
    const normalized = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    return isAbsoluteUrl ? `${parsedUrl.origin}${normalized}` : normalized
  } catch {
    return url
      .replace(/([?&])cachebust_origin=[^&#]*&?/g, "$1")
      .replace(/[?&]$/, "")
  }
}

export function getModelFileExtension(url: string): string {
  try {
    const parsedUrl = new URL(url, "https://model-url.invalid")
    return parsedUrl.pathname.split(".").pop()?.toLowerCase() ?? ""
  } catch {
    return url.split(/[?#]/)[0]?.split(".").pop()?.toLowerCase() ?? ""
  }
}

export function cloneModelInstance(model: THREE.Object3D): THREE.Object3D {
  const clone = model.clone(true)

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return

    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone()
  })

  return clone
}

async function loadModelTemplate(url: string): Promise<THREE.Object3D | null> {
  const extension = getModelFileExtension(url)

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

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  const cacheKey = getModelCacheKey(url)
  let templatePromise = modelCache.get(cacheKey)

  if (!templatePromise) {
    templatePromise = loadModelTemplate(url).catch((error) => {
      modelCache.delete(cacheKey)
      throw error
    })
    modelCache.set(cacheKey, templatePromise)
  }

  const template = await templatePromise
  return template ? cloneModelInstance(template) : null
}
