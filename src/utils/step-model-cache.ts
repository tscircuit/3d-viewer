export const STEP_GLB_CACHE_PREFIX = "step-glb-cache:"

export type ConvertedStepFile = {
  arrayBuffer: ArrayBuffer
  blobUrl: string
}

export type StepUrlConversionRegistry = {
  inProgress: Map<string, Promise<ConvertedStepFile>>
  completed: Map<string, ConvertedStepFile>
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
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

export function getCachedStepGlb(stepUrl: string): ArrayBuffer | null {
  try {
    const cached = localStorage.getItem(`${STEP_GLB_CACHE_PREFIX}${stepUrl}`)
    if (!cached) {
      return null
    }
    return base64ToArrayBuffer(cached)
  } catch (error) {
    console.warn("Failed to read STEP GLB cache", error)
    return null
  }
}

export function setCachedStepGlb(stepUrl: string, glb: ArrayBuffer): void {
  try {
    const encoded = arrayBufferToBase64(glb)
    localStorage.setItem(`${STEP_GLB_CACHE_PREFIX}${stepUrl}`, encoded)
  } catch (error) {
    console.warn("Failed to write STEP GLB cache", error)
  }
}

export function createConvertedStepFile(
  arrayBuffer: ArrayBuffer,
): ConvertedStepFile {
  return {
    arrayBuffer,
    blobUrl: URL.createObjectURL(
      new Blob([arrayBuffer], { type: "model/gltf-binary" }),
    ),
  }
}

export function getCachedConvertedStepFile(
  stepUrl: string,
  registry: StepUrlConversionRegistry,
): ConvertedStepFile | null {
  const existingCompleted = registry.completed.get(stepUrl)
  if (existingCompleted) {
    return existingCompleted
  }

  const cachedGlb = getCachedStepGlb(stepUrl)
  if (!cachedGlb) {
    return null
  }

  const cachedConverted = createConvertedStepFile(cachedGlb)
  registry.completed.set(stepUrl, cachedConverted)
  return cachedConverted
}
