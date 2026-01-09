import { useEffect, useState } from "react"
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three"
import { GLTFExporter } from "three-stdlib"
import { GltfModel } from "./GltfModel"

type OcctImportParams = {
  linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot"
  linearDeflectionType?: "bounding_box_ratio" | "absolute_value"
  linearDeflection?: number
  angularDeflection?: number
}

type OcctMesh = {
  name: string
  color?: [number, number, number]
  attributes: {
    position: { array: number[] }
    normal?: { array: number[] }
  }
  index: { array: number[] }
}

type OcctImportResult = {
  success: boolean
  meshes: OcctMesh[]
}

type OcctImport = {
  ReadStepFile(
    content: ArrayBufferView | ArrayBuffer,
    params: OcctImportParams | null,
  ): OcctImportResult
}

type OcctImportModuleConfig = {
  locateFile?: (path: string) => string
}

type OcctImportFactory = (
  config?: OcctImportModuleConfig,
) => Promise<OcctImport>

let occtImportPromise: Promise<OcctImport> | undefined
const OCCT_CDN_BASE_URL =
  "https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist"

function resolveOcctFactory(candidate: unknown): OcctImportFactory {
  if (typeof candidate === "function") {
    return candidate as OcctImportFactory
  }
  if (
    candidate &&
    typeof candidate === "object" &&
    "default" in candidate &&
    typeof (candidate as { default: unknown }).default === "function"
  ) {
    return (candidate as { default: unknown }).default as OcctImportFactory
  }
  throw new Error("Unable to resolve occt-import-js factory export")
}

async function loadOcctImport(): Promise<OcctImport> {
  if (!occtImportPromise) {
    const imported = await import(
      /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/+esm"
    )
    const factory = resolveOcctFactory(imported)
    occtImportPromise = factory({
      locateFile: (path: string) => `${OCCT_CDN_BASE_URL}/${path}`,
    })
  }
  return occtImportPromise
}

function occtMeshesToGroup(meshes: OcctMesh[]): Group {
  const group = new Group()
  for (const mesh of meshes) {
    const positions = mesh.attributes.position?.array ?? []
    const indices = mesh.index?.array ?? []
    if (!positions.length || !indices.length) {
      continue
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    const normals = mesh.attributes.normal?.array ?? []
    if (normals.length) {
      geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3))
    } else {
      geometry.computeVertexNormals()
    }
    geometry.setIndex(indices)
    const material = new MeshStandardMaterial({
      color: mesh.color
        ? new Color(mesh.color[0], mesh.color[1], mesh.color[2])
        : new Color(0.82, 0.82, 0.82),
    })
    const threeMesh = new Mesh(geometry, material)
    threeMesh.name = mesh.name
    group.add(threeMesh)
  }
  return group
}

async function convertStepUrlToGlbUrl(stepUrl: string): Promise<string> {
  const response = await fetch(stepUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch STEP file: ${response.statusText}`)
  }
  const buffer = await response.arrayBuffer()
  const occt = await loadOcctImport()
  const result = occt.ReadStepFile(new Uint8Array(buffer), null)
  if (!result.success || !result.meshes.length) {
    throw new Error("occt-import-js failed to convert STEP file")
  }
  const group = occtMeshesToGroup(result.meshes)
  const exporter = new GLTFExporter()
  const glb = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      group,
      (output) => {
        if (output instanceof ArrayBuffer) {
          resolve(output)
        } else {
          reject(new Error("GLTFExporter did not return binary output"))
        }
      },
      (error) => {
        reject(error)
      },
      { binary: true },
    )
  })
  return URL.createObjectURL(new Blob([glb], { type: "model/gltf-binary" }))
}

const CACHE_PREFIX = "step-glb-cache:"

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function getCachedGlb(stepUrl: string): ArrayBuffer | null {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${stepUrl}`)
    if (!cached) {
      return null
    }
    return base64ToArrayBuffer(cached)
  } catch (error) {
    console.warn("Failed to read STEP GLB cache", error)
    return null
  }
}

function setCachedGlb(stepUrl: string, glb: ArrayBuffer): void {
  try {
    const encoded = arrayBufferToBase64(glb)
    localStorage.setItem(`${CACHE_PREFIX}${stepUrl}`, encoded)
  } catch (error) {
    console.warn("Failed to write STEP GLB cache", error)
  }
}

type StepModelProps = {
  stepUrl: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  onHover: (event: unknown) => void
  onUnhover: () => void
  isHovered: boolean
  isTranslucent?: boolean
}

export const StepModel = ({
  stepUrl,
  position,
  rotation,
  scale,
  onHover,
  onUnhover,
  isHovered,
  isTranslucent,
}: StepModelProps) => {
  const [stepGltfUrl, setStepGltfUrl] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    let objectUrl: string | null = null
    const cachedGlb = getCachedGlb(stepUrl)
    if (cachedGlb) {
      objectUrl = URL.createObjectURL(
        new Blob([cachedGlb], { type: "model/gltf-binary" }),
      )
      setStepGltfUrl(objectUrl)
      return () => {
        isActive = false
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
        }
      }
    }
    void convertStepUrlToGlbUrl(stepUrl)
      .then((generatedUrl) => {
        if (!isActive) {
          URL.revokeObjectURL(generatedUrl)
          return
        }
        objectUrl = generatedUrl
        setStepGltfUrl(generatedUrl)
        fetch(generatedUrl)
          .then((response) => response.arrayBuffer())
          .then((glbBuffer) => {
            setCachedGlb(stepUrl, glbBuffer)
          })
          .catch((error) => {
            console.warn("Failed to cache STEP GLB", error)
          })
      })
      .catch((error) => {
        console.error("Failed to convert STEP file to GLB", error)
        if (isActive) {
          setStepGltfUrl(null)
        }
      })
    return () => {
      isActive = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [stepUrl])

  if (!stepGltfUrl) {
    return null
  }

  return (
    <GltfModel
      gltfUrl={stepGltfUrl}
      position={position}
      rotation={rotation}
      scale={scale}
      onHover={onHover}
      onUnhover={onUnhover}
      isHovered={isHovered}
      isTranslucent={isTranslucent}
    />
  )
}
