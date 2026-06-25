import type * as THREE from "three"
import { STLLoader } from "three-stdlib"

type StlLoaderLike = {
  load: (
    url: string,
    onLoad: (geometry: THREE.BufferGeometry) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ) => void
}

const stlGeometryCache = new Map<string, Promise<THREE.BufferGeometry>>()

export function normalizeStlUrlCacheKey(stlUrl: string): string {
  try {
    const parsedUrl = new URL(stlUrl, "https://cache-key.invalid")
    const isRelativeUrl = parsedUrl.origin === "https://cache-key.invalid"
    parsedUrl.searchParams.delete("cachebust_origin")

    if (isRelativeUrl) {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    }

    return parsedUrl.toString()
  } catch {
    const hashParts = stlUrl.split("#", 2)
    const urlWithoutHash = hashParts[0] ?? ""
    const hash = hashParts[1] ?? ""
    const [pathname, query = ""] = urlWithoutHash.split("?", 2)
    const filteredQuery = query
      .split("&")
      .filter((part) => part.split("=", 1)[0] !== "cachebust_origin")
      .join("&")

    return `${pathname}${filteredQuery ? `?${filteredQuery}` : ""}${
      hash ? `#${hash}` : ""
    }`
  }
}

export function clearStlGeometryCache() {
  stlGeometryCache.clear()
}

export async function loadCachedStlGeometry(
  stlUrl: string,
  createLoader: () => StlLoaderLike = () =>
    new STLLoader() as unknown as StlLoaderLike,
): Promise<THREE.BufferGeometry> {
  const cacheKey = normalizeStlUrlCacheKey(stlUrl)
  let geometryPromise = stlGeometryCache.get(cacheKey)

  if (!geometryPromise) {
    geometryPromise = new Promise<THREE.BufferGeometry>((resolve, reject) => {
      createLoader().load(stlUrl, resolve, undefined, reject)
    }).catch((error) => {
      stlGeometryCache.delete(cacheKey)
      throw error
    })

    stlGeometryCache.set(cacheKey, geometryPromise)
  }

  const geometry = await geometryPromise
  return geometry.clone()
}
