import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

type ModelLoadCache = Map<string, Promise<THREE.Object3D | null>>

type ModelLoadGlobal = typeof globalThis & {
  TSCIRCUIT_MODEL_CACHE?: ModelLoadCache
}

function cloneLoadedModel(model: THREE.Object3D | null): THREE.Object3D | null {
  return model ? model.clone(true) : null
}

export function getModelLoadCache(): ModelLoadCache {
  const globalScope = globalThis as ModelLoadGlobal
  if (!globalScope.TSCIRCUIT_MODEL_CACHE) {
    globalScope.TSCIRCUIT_MODEL_CACHE = new Map()
  }
  return globalScope.TSCIRCUIT_MODEL_CACHE
}

export async function loadCached3DModel(
  url: string,
  loadModel: () => Promise<THREE.Object3D | null>,
): Promise<THREE.Object3D | null> {
  const cache = getModelLoadCache()
  const cachedLoad = cache.get(url)
  if (cachedLoad) {
    return cloneLoadedModel(await cachedLoad)
  }

  const loadPromise = loadModel().catch((error) => {
    if (cache.get(url) === loadPromise) {
      cache.delete(url)
    }
    throw error
  })
  cache.set(url, loadPromise)

  return cloneLoadedModel(await loadPromise)
}

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  return loadCached3DModel(url, () => loadUncached3DModel(url))
}

async function loadUncached3DModel(
  url: string,
): Promise<THREE.Object3D | null> {
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
