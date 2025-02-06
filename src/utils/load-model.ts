import * as THREE from "three"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"

export async function load3DModel(url: string): Promise<THREE.Object3D | null> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch model: ${response.statusText}`)
  }

  // Try to get filename from Content-Disposition header
  const disposition = response.headers.get("content-disposition")
  let filename = ""
  if (disposition?.includes("filename=")) {
    const filenameMatch = disposition.match(/filename=([^;]+)/)
    filename = filenameMatch ? filenameMatch[1] : ""
  }

  const arrayBuffer = await response.arrayBuffer()

  // Check file extension from filename or url
  const isSTL =
    filename.toLowerCase().endsWith(".stl") ||
    url.toLowerCase().endsWith(".stl")

  if (isSTL) {
    const loader = new STLLoader()
    const geometry = loader.parse(arrayBuffer)

    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.5,
      roughness: 0.5,
      side: THREE.DoubleSide,
    })

    return new THREE.Mesh(geometry, material)
  } else {
    // Assume OBJ if not STL
    const text = new TextDecoder().decode(arrayBuffer)
    const loader = new OBJLoader()
    const object = loader.parse(text)

    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.5,
      roughness: 0.5,
      side: THREE.DoubleSide,
    })

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material
        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals()
        }
        child.geometry.center()
      }
    })
    object.renderOrder = 1

    return object
  }
}
