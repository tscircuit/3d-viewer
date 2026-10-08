import { useEffect, useState } from "react"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import { getCachedStepGlb, setCachedStepGlb } from "src/utils/step-glb-cache"
import { GLTFExporter } from "three-stdlib"
import { GltfModel } from "./GltfModel"
import { type OcctMesh, occtMeshesToGroup } from "./step-mesh-to-group"

type OcctImportParams = {
  linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot"
  linearDeflectionType?: "bounding_box_ratio" | "absolute_value"
  linearDeflection?: number
  angularDeflection?: number
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

async function convertStepUrlToGlb(stepUrl: string): Promise<ArrayBuffer> {
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
  return glb
}

type ConvertedStepFile = {
  arrayBuffer: ArrayBuffer
  blobUrl: string
}

type StepModelUrl = string

type StepUrlConversionRegistry = {
  inProgress: Map<StepModelUrl, Promise<ConvertedStepFile>>
  completed: Map<StepModelUrl, ConvertedStepFile>
}

function getStepUrlConversionRegistry(): StepUrlConversionRegistry {
  const globalScope = globalThis as {
    stepUrlToGltfModelConversions?: StepUrlConversionRegistry
  }
  if (!globalScope.stepUrlToGltfModelConversions) {
    globalScope.stepUrlToGltfModelConversions = {
      inProgress: new Map(),
      completed: new Map(),
    }
  }
  return globalScope.stepUrlToGltfModelConversions
}

function createConvertedStepFile(arrayBuffer: ArrayBuffer): ConvertedStepFile {
  return {
    arrayBuffer,
    blobUrl: URL.createObjectURL(
      new Blob([arrayBuffer], { type: "model/gltf-binary" }),
    ),
  }
}

async function getConvertedStepFile({
  registry,
  stepUrl,
}: {
  registry: StepUrlConversionRegistry
  stepUrl: string
}): Promise<ConvertedStepFile> {
  const completedConversion = registry.completed.get(stepUrl)
  if (completedConversion) return completedConversion

  const cachedGlb = await getCachedStepGlb(stepUrl)
  const conversionCompletedWhileReadingCache = registry.completed.get(stepUrl)
  if (conversionCompletedWhileReadingCache) {
    return conversionCompletedWhileReadingCache
  }
  if (cachedGlb) {
    const cachedConversion = createConvertedStepFile(cachedGlb)
    registry.completed.set(stepUrl, cachedConversion)
    return cachedConversion
  }

  let conversionPromise = registry.inProgress.get(stepUrl)
  if (!conversionPromise) {
    conversionPromise = convertStepUrlToGlb(stepUrl)
      .then((glbBuffer) => {
        const convertedStepFile = createConvertedStepFile(glbBuffer)
        registry.completed.set(stepUrl, convertedStepFile)
        void setCachedStepGlb(stepUrl, glbBuffer)
        return convertedStepFile
      })
      .finally(() => {
        registry.inProgress.delete(stepUrl)
      })
    registry.inProgress.set(stepUrl, conversionPromise)
  }
  return conversionPromise
}

type StepModelProps = {
  stepUrl: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  modelOffset?: [number, number, number]
  modelRotation?: [number, number, number]
  sourceCoordinateTransform?: import("three").Matrix4
  modelSize?: CadModelSize
  modelFitMode?: CadModelFitMode
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
  modelOffset,
  modelRotation,
  sourceCoordinateTransform,
  modelSize,
  modelFitMode,
  scale,
  onHover,
  onUnhover,
  isHovered,
  isTranslucent,
}: StepModelProps) => {
  const [stepGltfUrl, setStepGltfUrl] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    const registry = getStepUrlConversionRegistry()

    void getConvertedStepFile({ registry, stepUrl })
      .then((converted) => {
        if (isActive) setStepGltfUrl(converted.blobUrl)
      })
      .catch((error) => {
        console.error("Failed to convert STEP file to GLB", error)
        if (isActive) {
          setStepGltfUrl(null)
        }
      })
    return () => {
      isActive = false
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
      modelOffset={modelOffset}
      modelRotation={modelRotation}
      sourceCoordinateTransform={sourceCoordinateTransform}
      modelSize={modelSize}
      modelFitMode={modelFitMode}
      scale={scale}
      onHover={onHover}
      onUnhover={onUnhover}
      isHovered={isHovered}
      isTranslucent={isTranslucent}
    />
  )
}
