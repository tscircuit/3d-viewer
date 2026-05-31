import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

const modelLoadCache = new Map<string, Promise<THREE.Object3D | null>>()

export function getLoad3DModelCacheKey(url: string): string {
  try {
    const parsed = new URL(url, "https://tscircuit.local")
    parsed.searchParams.delete("cachebust_origin")
    parsed.searchParams.sort()
    parsed.hash = ""
    const normalized = parsed.toString()
    return url.startsWith("http")
      ? normalized
      : normalized.replace("https://tscircuit.local", "")
  } catch {
    return url.replace(/([?&])cachebust_origin=[^&#]*/g, "$1").replace(/[?&]$/, "")
  }
}

export function clearLoad3DModelCacheForTests() {
  modelLoadCache.clear()
}

function cloneModel(model: THREE.Object3D | null): THREE.Object3D | null {
  if (!model) return null
  const clone = model.clone(true)
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const material = child.material
    if (Array.isArray(material)) {
      child.material = material.map((mat) => mat.clone())
    } else if (material) {
      child.material = material.clone()
    }
  })
  return clone
}

async function load3DModelUncached(url: string): Promise<THREE.Object3D | null> {
  const cacheKey = getLoad3DModelCacheKey(url)
  const extensionPath = cacheKey.split("?")[0].toLowerCase()

  if (extensionPath.endsWith(".stl")) {
    const loader = new STLLoader()
    const geometry = await loader.loadAsync(url)
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.5,
      roughness: 0.5,
    })
    return new THREE.Mesh(geometry, material)
  }

  if (extensionPath.endsWith(".obj")) {
    const loader = new OBJLoader()
    return await loader.loadAsync(url)
  }

  if (extensionPath.endsWith(".wrl")) {
    return await loadVrml(url)
  }

  if (extensionPath.endsWith(".gltf") || extensionPath.endsWith(".glb")) {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)
    return gltf.scene
  }

  console.error("Unsupported file format or failed to load 3D model.")
  return null
}

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  const cacheKey = getLoad3DModelCacheKey(url)
  let cachedPromise = modelLoadCache.get(cacheKey)
  if (!cachedPromise) {
    cachedPromise = load3DModelUncached(url).catch((error) => {
      modelLoadCache.delete(cacheKey)
      throw error
    })
    modelLoadCache.set(cacheKey, cachedPromise)
  }
  return cloneModel(await cachedPromise)
}
