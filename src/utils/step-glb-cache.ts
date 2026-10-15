const STEP_GLB_CACHE_NAME = "tscircuit-step-glb-v3"
const LEGACY_CACHE_PREFIX = "step-glb-cache:v2:"

let didRemoveLegacyEntries = false

function removeLegacyLocalStorageEntries(): void {
  if (didRemoveLegacyEntries) return

  try {
    const legacyStorage = globalThis.localStorage
    if (!legacyStorage) return

    for (let index = legacyStorage.length - 1; index >= 0; index -= 1) {
      const cacheKey = legacyStorage.key(index)
      if (cacheKey?.startsWith(LEGACY_CACHE_PREFIX)) {
        legacyStorage.removeItem(cacheKey)
      }
    }
    didRemoveLegacyEntries = true
  } catch {
    // localStorage can be unavailable in private or restricted contexts.
  }
}

function getCacheStorage(): CacheStorage | undefined {
  try {
    return globalThis.caches
  } catch {
    return undefined
  }
}

export async function getCachedStepGlb(
  stepUrl: string,
): Promise<ArrayBuffer | null> {
  removeLegacyLocalStorageEntries()
  const cacheStorage = getCacheStorage()
  if (!cacheStorage) return null

  try {
    const cache = await cacheStorage.open(STEP_GLB_CACHE_NAME)
    const response = await cache.match(stepUrl)
    return response ? await response.arrayBuffer() : null
  } catch (error) {
    console.warn("Failed to read STEP GLB cache", error)
    return null
  }
}

export async function setCachedStepGlb(
  stepUrl: string,
  glb: ArrayBuffer,
): Promise<void> {
  removeLegacyLocalStorageEntries()
  const cacheStorage = getCacheStorage()
  if (!cacheStorage) return

  try {
    const cache = await cacheStorage.open(STEP_GLB_CACHE_NAME)
    await cache.put(
      stepUrl,
      new Response(glb, {
        headers: { "Content-Type": "model/gltf-binary" },
      }),
    )
  } catch (error) {
    console.warn("Failed to write STEP GLB cache", error)
  }
}
