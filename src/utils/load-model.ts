import * as THREE from "three"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
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

  console.error("Unsupported file format or failed to load 3D model.")
  return null
}
