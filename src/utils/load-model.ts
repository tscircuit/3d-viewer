import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

interface ModelCacheItem {
  promise: Promise<THREE.Object3D | null>
  result: THREE.Object3D | null
}

const modelCache = new Map<string, ModelCacheItem>()

export function getModelCacheKey(url: string): string {
  try {
    const parsedUrl = new URL(url, "https://tscircuit.local")
    parsedUrl.searchParams.delete("cachebust_origin")

    const normalizedPath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return `${parsedUrl.origin}${normalizedPath}`
    }

    return url.startsWith("/") ? normalizedPath : normalizedPath.slice(1)
  } catch {
    return url
      .replace(/([?&])cachebust_origin=[^&#]*&?/g, "$1")
      .replace(/[?&]$/, "")
  }
}

function getModelExtension(url: string): string {
  return getModelCacheKey(url).split("#")[0]!.split("?")[0]!.toLowerCase()
}

function cloneMaterial(
  material: THREE.Material | THREE.Material[],
): THREE.Material | THREE.Material[] {
  return Array.isArray(material)
    ? material.map((singleMaterial) => singleMaterial.clone())
    : material.clone()
}

function cloneCachedModel(model: THREE.Object3D | null): THREE.Object3D | null {
  if (!model) return null

  const clonedModel = model.clone(true)
  clonedModel.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (mesh.isMesh && mesh.material) {
      mesh.material = cloneMaterial(mesh.material)
    }
  })
  return clonedModel
}

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  const cacheKey = getModelCacheKey(url)
  const cachedModel = modelCache.get(cacheKey)

  if (cachedModel) {
    const result = cachedModel.result ?? (await cachedModel.promise)
    return cloneCachedModel(result)
  }

  const promise = loadUncached3DModel(url)

  modelCache.set(cacheKey, {
    promise,
    result: null,
  })

  try {
    const result = await promise
    const cacheItem = modelCache.get(cacheKey)
    if (cacheItem) {
      cacheItem.result = result
    }
    return cloneCachedModel(result)
  } catch (error) {
    modelCache.delete(cacheKey)
    throw error
  }
}

async function loadUncached3DModel(
  url: string,
): Promise<THREE.Object3D | null> {
  const modelExtension = getModelExtension(url)

  if (modelExtension.endsWith(".stl")) {
    const loader = new STLLoader()
    const geometry = await loader.loadAsync(url)
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.5,
      roughness: 0.5,
    })
    return new THREE.Mesh(geometry, material)
  }

  if (modelExtension.endsWith(".obj")) {
    const loader = new OBJLoader()
    return await loader.loadAsync(url)
  }

  if (modelExtension.endsWith(".wrl")) {
    return await loadVrml(url)
  }

  if (modelExtension.endsWith(".gltf") || modelExtension.endsWith(".glb")) {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)
    return gltf.scene
  }

  console.error("Unsupported file format or failed to load 3D model.")
  return null
}
