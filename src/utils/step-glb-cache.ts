const CACHE_NAME = "tscircuit-step-glb-v3"
const CACHE_REQUEST_ORIGIN = "https://step-glb-cache.tscircuit.local"
const LEGACY_CACHE_PREFIX = "step-glb-cache:v2:"

let hasRemovedLegacyCache = false

async function getCacheRequest(stepUrl: string): Promise<Request> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stepUrl),
  )
  const digestHex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
  return new Request(`${CACHE_REQUEST_ORIGIN}/${digestHex}`)
}

function removeLegacyLocalStorageCache(): void {
  if (hasRemovedLegacyCache) return
  hasRemovedLegacyCache = true

  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(LEGACY_CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export async function getCachedStepGlb(
  stepUrl: string,
): Promise<ArrayBuffer | null> {
  removeLegacyLocalStorageCache()
  if (!globalThis.caches) return null

  try {
    const cache = await globalThis.caches.open(CACHE_NAME)
    const response = await cache.match(await getCacheRequest(stepUrl))
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
  removeLegacyLocalStorageCache()
  if (!globalThis.caches) return

  try {
    const cache = await globalThis.caches.open(CACHE_NAME)
    await cache.put(
      await getCacheRequest(stepUrl),
      new Response(glb, {
        headers: { "Content-Type": "model/gltf-binary" },
      }),
    )
  } catch (error) {
    console.warn("Failed to write STEP GLB cache", error)
  }
}
