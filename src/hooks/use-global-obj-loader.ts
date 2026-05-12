import { useEffect, useState } from "react"
import { loadVrml } from "src/utils/vrml"
import type { Object3D } from "three"
import { MTLLoader, OBJLoader } from "three-stdlib"

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

export function getGlobalObjLoaderCacheKey(url: string) {
  try {
    const isAbsoluteUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)
    const parsedUrl = new URL(
      url,
      isAbsoluteUrl ? undefined : "https://tscircuit.local",
    )
    parsedUrl.searchParams.delete("cachebust_origin")

    if (isAbsoluteUrl) {
      return parsedUrl.toString()
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
  } catch {
    return url
      .replace(/([?&])cachebust_origin=[^&]*&?/, "$1")
      .replace(/[?&]$/, "")
  }
}

export function useGlobalObjLoader(
  url: string | null,
): Object3D | null | Error {
  const [obj, setObj] = useState<Object3D | null | Error>(null)

  useEffect(() => {
    if (!url) return

    const modelUrl = url
    const cacheKey = getGlobalObjLoaderCacheKey(modelUrl)

    const cache = window.TSCIRCUIT_OBJ_LOADER_CACHE
    let hasUrlChanged = false

    async function loadAndParseObj() {
      try {
        if (modelUrl.endsWith(".wrl")) {
          return await loadVrml(modelUrl)
        }

        const response = await fetch(modelUrl)
        if (!response.ok) {
          throw new Error(
            `Failed to fetch "${modelUrl}": ${response.status} ${response.statusText}`,
          )
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
      const promise = loadAndParseObj().then((result) => {
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
  }, [url])

  return obj
}
