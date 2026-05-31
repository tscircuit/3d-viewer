import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

interface CacheEntry {
  promise: Promise<THREE.Object3D | null>
  result: THREE.Object3D | null
}

declare global {
  interface Window {
    TSCIRCUIT_3D_MODEL_CACHE: Map<string, CacheEntry>
  }
}

if (typeof window !== "undefined" && !window.TSCIRCUIT_3D_MODEL_CACHE) {
  window.TSCIRCUIT_3D_MODEL_CACHE = new Map()
}

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
  if (typeof window === "undefined") {
    return loadModelInternal(url)
  }

  const cleanUrl = url.replace(/&cachebust_origin=$/, "")
  const cache = window.TSCIRCUIT_3D_MODEL_CACHE

  if (cache.has(cleanUrl)) {
    const entry = cache.get(cleanUrl)!
    if (entry.result) {
      return entry.result.clone() as THREE.Object3D
    }
    const result = await entry.promise
    return result ? (result.clone() as THREE.Object3D) : null
  }

  const promise = loadModelInternal(cleanUrl)
  cache.set(cleanUrl, { promise, result: null })

  const result = await promise
  cache.set(cleanUrl, { promise, result })
  return result ? (result.clone() as THREE.Object3D) : null
}
