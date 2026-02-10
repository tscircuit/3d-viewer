import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

// Define the type for our cache
interface ModelCacheItem {
  promise: Promise<THREE.Object3D | null>
  result: THREE.Object3D | null
}

declare global {
  interface Window {
    TSCIRCUIT_3D_MODEL_CACHE: Map<string, ModelCacheItem>
  }
}

// Ensure the global cache exists
if (typeof window !== "undefined" && !window.TSCIRCUIT_3D_MODEL_CACHE) {
  window.TSCIRCUIT_3D_MODEL_CACHE = new Map<string, ModelCacheItem>()
}

// Helper function to clean URL (remove cache-busting parameters)
function cleanUrl(url: string): string {
  return url.replace(/[?&]cachebust[^&]*(&|$)/g, "").replace(/&$/, "")
}

// Internal function that does the actual loading
async function loadModelInternal(url: string): Promise<THREE.Object3D | null> {
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
  // Skip caching in non-browser environments
  if (typeof window === "undefined") {
    return loadModelInternal(url)
  }

  const cache = window.TSCIRCUIT_3D_MODEL_CACHE
  const cacheKey = cleanUrl(url)

  // Check if model is already cached
  if (cache.has(cacheKey)) {
    const cacheItem = cache.get(cacheKey)!

    // If we have a result, clone it to avoid sharing the same Three.js object
    if (cacheItem.result) {
      return cacheItem.result.clone()
    }

    // If still loading, wait for the promise and then clone
    return cacheItem.promise.then((result) => {
      return result ? result.clone() : null
    })
  }

  // If not in cache, create a new promise and cache it
  const promise = loadModelInternal(url)
    .then((result) => {
      if (result) {
        // Store the result in cache
        cache.set(cacheKey, { ...cache.get(cacheKey)!, result })
      }
      return result
    })
    .catch((error) => {
      console.error(`Failed to load 3D model from ${url}:`, error)
      // Remove failed load from cache so it can be retried
      cache.delete(cacheKey)
      return null
    })

  // Immediately store the promise in cache to prevent duplicate requests
  cache.set(cacheKey, { promise, result: null })

  return promise
}
