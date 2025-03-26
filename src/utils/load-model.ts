import * as THREE from "three"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js"
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
    // Handle OBJ file
    const text = new TextDecoder().decode(arrayBuffer)

    // Extract material definitions and obj content
    const mtlContent = text.match(/newmtl[\s\S]*?endmtl/g)?.join("\n")
    const objContent = text.replace(/newmtl[\s\S]*?endmtl/g, "")

    if (mtlContent) {
      // Parse materials using MTLLoader
      const mtlLoader = new MTLLoader()
      mtlLoader.setMaterialOptions({
        invertTrProperty: true,
      })

      // Process material content - convert colors to grayscale as in the reference
      const processedMtlContent = mtlContent
        .replace(/d 0\./g, "d 1.")
        .replace(/Kd\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/g, "Kd $2 $2 $2")

      const materials = mtlLoader.parse(processedMtlContent, "")

      // Parse OBJ with materials
      const loader = new OBJLoader()
      loader.setMaterials(materials)
      const object = loader.parse(objContent)

      // Process geometries
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (!child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals()
          }
          child.geometry.center()
        }
      })

      return object
    } else {
      // If no materials found, use default material
      const loader = new OBJLoader()
      const object = loader.parse(text)

      const defaultMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.5,
        roughness: 0.5,
        side: THREE.DoubleSide,
      })

      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = defaultMaterial
          if (!child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals()
          }
          child.geometry.center()
        }
      })

      return object
    }
  }
}
