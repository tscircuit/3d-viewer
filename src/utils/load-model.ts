import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { loadVrml } from "./vrml"

// ✅ Finished model cache
const modelCache = new Map<string, THREE.Object3D>()

// ✅ In-flight promise cache (prevents duplicate simultaneous loads)
const loadingPromises = new Map<string, Promise<THREE.Object3D | null>>()

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  // ✅ Cache HIT (already loaded)
  if (modelCache.has(url)) {
    return modelCache.get(url)!.clone()
  }

  // ✅ Already loading → await same promise
  if (loadingPromises.has(url)) {
    const result = await loadingPromises.get(url)!
    return result ? result.clone() : null
  }

  // ✅ Start new load and store promise immediately
  const promise = (async (): Promise<THREE.Object3D | null> => {
    try {
      // STL
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

      // OBJ
      if (url.endsWith(".obj")) {
        const loader = new OBJLoader()
        return await loader.loadAsync(url)
      }

      // WRL
      if (url.endsWith(".wrl")) {
        return await loadVrml(url)
      }

      // GLTF / GLB
      if (url.endsWith(".gltf") || url.endsWith(".glb")) {
        const loader = new GLTFLoader()
        const gltf = await loader.loadAsync(url)
        return gltf.scene
      }

      console.error("Unsupported file format:", url)
      return null
    } catch (err) {
      console.error("Failed to load model:", url, err)
      return null
    }
  })()

  loadingPromises.set(url, promise)

  // Await load result
  const result = await promise

  // Remove promise after completion
  loadingPromises.delete(url)

  // Store successful result in final cache
  if (result) {
    modelCache.set(url, result)
    return result.clone()
  }

  return null
}
