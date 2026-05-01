import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

/**
 * Module-level cache for loaded 3D models.
 * Stores in-flight promises to deduplicate concurrent requests for the same URL,
 * and stores resolved objects for instant retrieval on subsequent requests.
 */
const modelCache = new Map<string, Promise<THREE.Object3D | null>>()

/**
 * Clear the model cache (useful for testing or when memory pressure is high).
 */
export function clearModelCache(): void {
  modelCache.clear()
}

async function loadModelUncached(url: string): Promise<THREE.Object3D | null> {
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

/**
 * Load a 3D model from the given URL, using a module-level cache to avoid
 * duplicate network requests and redundant parsing for the same model URL.
 *
 * Concurrent calls for the same URL share a single in-flight request.
 * Subsequent calls after the first resolution return a cloned copy of the
 * cached object so each consumer gets an independent Three.js scene graph.
 */
export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  const cached = modelCache.get(url)
  if (cached !== undefined) {
    const result = await cached
    return result ? (result.clone() as THREE.Object3D) : null
  }

  const promise = loadModelUncached(url)
  modelCache.set(url, promise)

  try {
    return await promise
  } catch (error) {
    // Remove failed entries so they can be retried on the next call
    modelCache.delete(url)
    throw error
  }
}
