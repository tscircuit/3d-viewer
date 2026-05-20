import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

type SupportedModelExtension = ".stl" | ".obj" | ".wrl" | ".gltf" | ".glb"

const supportedModelExtensions = new Set<SupportedModelExtension>([
  ".stl",
  ".obj",
  ".wrl",
  ".gltf",
  ".glb",
])

const modelCache = new Map<string, Promise<THREE.Object3D | null>>()

export function getModelFileExtension(
  url: string,
): SupportedModelExtension | null {
  const path = getUrlPathname(url).toLowerCase()
  const dotIndex = path.lastIndexOf(".")
  if (dotIndex === -1) return null

  const extension = path.slice(dotIndex) as SupportedModelExtension
  return supportedModelExtensions.has(extension) ? extension : null
}

export function getModelCacheKey(url: string): string {
  const parsed = parseModelUrl(url)
  if (!parsed) return url.replace(/([?&])cachebust_origin=[^&#]*&?/, "$1")

  parsed.searchParams.delete("cachebust_origin")
  return parsed.href
}

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  const cacheKey = getModelCacheKey(url)
  let cachedModelPromise = modelCache.get(cacheKey)

  if (!cachedModelPromise) {
    cachedModelPromise = load3DModelUncached(url)
    modelCache.set(cacheKey, cachedModelPromise)
  }

  const cachedModel = await cachedModelPromise
  return cachedModel ? cloneModelForInstance(cachedModel) : null
}

async function load3DModelUncached(
  url: string,
): Promise<THREE.Object3D | null> {
  const extension = getModelFileExtension(url)

  if (extension === ".stl") {
    const loader = new STLLoader()
    const geometry = await loader.loadAsync(url)
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.5,
      roughness: 0.5,
    })
    return new THREE.Mesh(geometry, material)
  }

  if (extension === ".obj") {
    const loader = new OBJLoader()
    return await loader.loadAsync(url)
  }

  if (extension === ".wrl") {
    return await loadVrml(url)
  }

  if (extension === ".gltf" || extension === ".glb") {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)
    return gltf.scene
  }

  console.error("Unsupported file format or failed to load 3D model.")
  return null
}

function cloneModelForInstance(model: THREE.Object3D): THREE.Object3D {
  const clone = model.clone(true)

  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return

    object.geometry = object.geometry.clone()
    if (Array.isArray(object.material)) {
      object.material = object.material.map((material) => material.clone())
    } else {
      object.material = object.material.clone()
    }
  })

  return clone
}

function getUrlPathname(url: string): string {
  return parseModelUrl(url)?.pathname ?? url.split(/[?#]/, 1)[0] ?? url
}

function parseModelUrl(url: string): URL | null {
  try {
    return new URL(url, "https://tscircuit.local")
  } catch {
    return null
  }
}
