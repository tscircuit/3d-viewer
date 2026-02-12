import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

// Global cache for loaded 3D models
interface ModelCacheItem {
  promise: Promise<THREE.Object3D | null>
  result: THREE.Object3D | null
}

declare global {
  interface Window {
    TSCIRCUIT_3D_MODEL_CACHE: Map<string, ModelCacheItem>
  }
}

// Initialize global cache
if (typeof window !== "undefined" && !window.TSCIRCUIT_3D_MODEL_CACHE) {
  window.TSCIRCUIT_3D_MODEL_CACHE = new Map<string, ModelCacheItem>()
}

async function loadModelFromUrl(url: string): Promise<THREE.Object3D | null> {
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
  // Clean the URL (remove cache busting parameters)
  const cleanUrl = url.replace(/&cachebust_origin=$/, "")

  const cache = window.TSCIRCUIT_3D_MODEL_CACHE

  // Check if model is already in cache
  if (cache.has(cleanUrl)) {
    const cacheItem = cache.get(cleanUrl)!

    // If we have a cached result, clone it to avoid sharing the same object
    if (cacheItem.result) {
      return cacheItem.result.clone()
    }

    // If we're still loading, wait for the existing promise and clone the result
    return cacheItem.promise.then((result) => {
      return result ? result.clone() : null
    })
  }

  // If not in cache, create a new loading promise
  const promise = loadModelFromUrl(cleanUrl).then((result) => {
    // Store the result in cache
    if (result) {
      cache.set(cleanUrl, { ...cache.get(cleanUrl)!, result })
    }
    return result
  })

  // Store the promise in cache immediately
  cache.set(cleanUrl, { promise, result: null })

  return promise
}
