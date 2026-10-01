import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

const modelCache = new Map<string, Promise<THREE.Object3D | null>>()

export function getModelCacheKey(url: string): string {
  try {
    const parsedUrl = new URL(url, "https://tscircuit.local")
    parsedUrl.searchParams.delete("cachebust_origin")

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return parsedUrl.toString()
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
  } catch {
    return url
      .replace(/([?&])cachebust_origin=[^&]*&?/, "$1")
      .replace(/[?&]$/, "")
  }
}

export function getModelExtension(url: string): string {
  try {
    return (
      new URL(url, "https://tscircuit.local").pathname
        .split(".")
        .pop()
        ?.toLowerCase() ?? ""
    )
  } catch {
    return url.split("?")[0]?.split(".").pop()?.toLowerCase() ?? ""
  }
}

export function cloneLoadedModel(model: THREE.Object3D): THREE.Object3D {
  const clone = model.clone(true)
  clone.traverse((object) => {
    if (!("material" in object)) return
    const mesh = object as THREE.Mesh
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => material.clone())
    } else if (mesh.material) {
      mesh.material = mesh.material.clone()
    }
  })
  return clone
}

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  const cacheKey = getModelCacheKey(url)
  if (!modelCache.has(cacheKey)) {
    modelCache.set(cacheKey, load3DModelUncached(url))
  }

  const cachedModel = await modelCache.get(cacheKey)!
  return cachedModel ? cloneLoadedModel(cachedModel) : null
}

async function load3DModelUncached(
  url: string,
): Promise<THREE.Object3D | null> {
  const extension = getModelExtension(url)

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
