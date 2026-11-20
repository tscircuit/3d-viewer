import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

interface ModelCacheItem {
  promise: Promise<THREE.Object3D | null>
  result: THREE.Object3D | null
}

declare global {
  interface Window {
    TSCIRCUIT_3D_MODEL_CACHE: Map<string, ModelCacheItem>
  }
}

if (typeof window !== "undefined" && !window.TSCIRCUIT_3D_MODEL_CACHE) {
  window.TSCIRCUIT_3D_MODEL_CACHE = new Map<string, ModelCacheItem>()
}

async function loadModel(url: string): Promise<THREE.Object3D | null> {
  if (url.endsWith(".stl")) {
    const loader = new STLLoader()
    const geometry = await loader.loadAsync(url)
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.5,
      roughness: 0.5,
    })
    return new THREE.Mesh(geometry, material)
  }

  if (url.endsWith(".obj")) {
    const loader = new OBJLoader()
    return await loader.loadAsync(url)
  }

  if (url.endsWith(".wrl")) {
    return await loadVrml(url)
  }

  if (url.endsWith(".gltf") || url.endsWith(".glb")) {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)
    return gltf.scene
  }

  console.error("Unsupported file format or failed to load 3D model.")
  return null
}

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  if (typeof window === "undefined") {
    return loadModel(url)
  }

  const cleanUrl = url.replace(/&cachebust_origin=$/, "")
  const cache = window.TSCIRCUIT_3D_MODEL_CACHE

  if (cache.has(cleanUrl)) {
    const cacheItem = cache.get(cleanUrl)!
    if (cacheItem.result) {
      return cacheItem.result.clone()
    }
    return cacheItem.promise.then((result) => result?.clone() ?? null)
  }

  const promise = loadModel(cleanUrl).then((result) => {
    cache.set(cleanUrl, { ...cache.get(cleanUrl)!, result })
    return result
  })
  cache.set(cleanUrl, { promise, result: null })
  return promise
}
