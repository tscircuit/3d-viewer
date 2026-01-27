import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

// ✅ Global cache to prevent duplicate model loading
const modelCache = new Map<string, THREE.Object3D>()

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  // ✅ Cache HIT
  if (modelCache.has(url)) {
    return modelCache.get(url)!.clone()
  }

  // STL
  if (url.endsWith(".stl")) {
    const loader = new STLLoader()
    const geometry = await loader.loadAsync(url)

    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.5,
      roughness: 0.5,
    })

    const mesh = new THREE.Mesh(geometry, material)

    modelCache.set(url, mesh)
    return mesh.clone()
  }

  // OBJ
  if (url.endsWith(".obj")) {
    const loader = new OBJLoader()
    const model = await loader.loadAsync(url)

    modelCache.set(url, model)
    return model.clone()
  }

  // WRL
  if (url.endsWith(".wrl")) {
    const model = await loadVrml(url)

    if (model) {
      modelCache.set(url, model)
      return model.clone()
    }

    return null
  }

  // GLTF / GLB
  if (url.endsWith(".gltf") || url.endsWith(".glb")) {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)

    modelCache.set(url, gltf.scene)
    return gltf.scene.clone()
  }

  console.error("Unsupported file format or failed to load 3D model.")
  return null
}
