import { useEffect, useState } from "react"
import { loadVrml } from "src/utils/vrml"
import type { Object3D } from "three"
import * as THREE from "three"
import { MTLLoader, OBJLoader, STLLoader } from "three-stdlib"

export type GlobalObjLoaderModelType = "obj" | "wrl" | "stl"

export function getModelLoaderType(
  url: string,
  modelType?: GlobalObjLoaderModelType,
): GlobalObjLoaderModelType {
  if (modelType) return modelType

  const pathname = url.split("#")[0]!.split("?")[0]!.toLowerCase()
  if (pathname.endsWith(".wrl")) return "wrl"
  if (pathname.endsWith(".stl")) return "stl"
  return "obj"
}

export function getModelLoaderCacheKey(
  url: string,
  modelType?: GlobalObjLoaderModelType,
): string {
  const [urlWithoutHash, hash] = url.split("#", 2)
  const [pathname, query] = urlWithoutHash!.split("?", 2)
  const resolvedModelType = getModelLoaderType(url, modelType)

  if (!query) return `${resolvedModelType}:${url}`

  const searchParams = new URLSearchParams(query)
  searchParams.delete("cachebust_origin")
  const normalizedQuery = searchParams.toString()
  const normalizedUrl = `${pathname}${normalizedQuery ? `?${normalizedQuery}` : ""}${hash ? `#${hash}` : ""}`

  return `${resolvedModelType}:${normalizedUrl}`
}

export async function loadModelForGlobalObjLoader(
  url: string,
  modelType: GlobalObjLoaderModelType,
): Promise<Object3D | Error> {
  try {
    if (modelType === "wrl") {
      return await loadVrml(url)
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch "${url}": ${response.status} ${response.statusText}`,
      )
    }

    if (modelType === "stl") {
      const geometry = new STLLoader().parse(await response.arrayBuffer())
      const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.5,
        roughness: 0.5,
      })
      return new THREE.Mesh(geometry, material)
    }

    const text = await response.text()
    const mtlContentArr = text.match(/newmtl[\s\S]*?endmtl/g)

    const objLoader = new OBJLoader()

    if (mtlContentArr?.length) {
      const mtlContent = mtlContentArr.join("\n").replace(/d 0\./g, "d 1.")
      const objContent = text
        .replace(/newmtl[\s\S]*?endmtl/g, "")
        .replace(/^mtllib.*/gm, "")

      const mtlLoader = new MTLLoader()
      mtlLoader.setMaterialOptions({
        invertTrProperty: true,
      })
      const materials = mtlLoader.parse(
        mtlContent.replace(
          /Kd\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/g,
          "Kd $2 $2 $2",
        ),
        "embedded.mtl",
      )
      objLoader.setMaterials(materials)
      return objLoader.parse(objContent)
    }

    return objLoader.parse(text.replace(/^mtllib.*/gm, ""))
  } catch (error) {
    return error as Error
  }
}

// Define the type for our cache
interface CacheItem {
  promise: Promise<any>
  result: Object3D | null
}

declare global {
  interface Window {
    TSCIRCUIT_OBJ_LOADER_CACHE: Map<string, CacheItem>
  }
}

// Ensure the global cache exists
if (typeof window !== "undefined" && !window.TSCIRCUIT_OBJ_LOADER_CACHE) {
  window.TSCIRCUIT_OBJ_LOADER_CACHE = new Map<string, CacheItem>()
}

export function useGlobalObjLoader(
  url: string | null,
  modelType?: GlobalObjLoaderModelType,
): Object3D | null | Error {
  const [obj, setObj] = useState<Object3D | null | Error>(null)

  useEffect(() => {
    if (!url) return

    const modelUrl = url
    const loaderModelType = getModelLoaderType(modelUrl, modelType)
    const cacheKey = getModelLoaderCacheKey(modelUrl, loaderModelType)

    const cache = window.TSCIRCUIT_OBJ_LOADER_CACHE
    let hasUrlChanged = false

    function loadUrl() {
      if (cache.has(cacheKey)) {
        const cacheItem = cache.get(cacheKey)!
        if (cacheItem.result) {
          // If we have a result, clone it
          return Promise.resolve(cacheItem.result.clone())
        }
        // If we're still loading, return the existing promise
        return cacheItem.promise.then((result) => {
          if (result instanceof Error) return result
          return result.clone()
        })
      }
      // If it's not in the cache, create a new promise and cache it
      const promise = loadModelForGlobalObjLoader(
        modelUrl,
        loaderModelType,
      ).then((result) => {
        if (result instanceof Error) {
          // If the result is an Error, return it
          return result
        }
        cache.set(cacheKey, { ...cache.get(cacheKey)!, result })
        return result
      })
      cache.set(cacheKey, { promise, result: null })
      return promise
    }

    loadUrl()
      .then((result) => {
        if (hasUrlChanged) return
        setObj(result)
      })
      .catch((error) => {
        console.error(error)
      })

    return () => {
      hasUrlChanged = true
    }
  }, [url, modelType])

  return obj
}
