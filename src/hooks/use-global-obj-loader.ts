import { useState, useEffect } from "react"
import type { Group } from "three"
import { MTLLoader, OBJLoader } from "three-stdlib"

// Define the type for our cache
interface CacheItem {
  promise: Promise<any>
  result: Group | null
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

export function useGlobalObjLoader(url: string | null): Group | null | Error {
  const [obj, setObj] = useState<Group | null | Error>(null)

  useEffect(() => {
    if (!url) return

    const cache = window.TSCIRCUIT_OBJ_LOADER_CACHE
    let hasUrlChanged = false

    async function loadAndParseObj() {
      try {
        const response = await fetch(url!)
        if (!response.ok) {
          throw new Error(
            `Failed to fetch "${url}": ${response.status} ${response.statusText}`,
          )
        }
        const text = await response.text()

        const mtlContent = text
          .match(/newmtl[\s\S]*?endmtl/g)
          ?.join("\n")!
          .replace(/d 0\./g, "d 1.")!
        const objContent = text.replace(/newmtl[\s\S]*?endmtl/g, "")

        const mtlLoader = new MTLLoader()
        mtlLoader.setMaterialOptions({
          invertTrProperty: true,
        })
        const materials = mtlLoader.parse(
          mtlContent.replace(
            /Kd\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/g,
            "Kd $2 $2 $2",
          ),
          "test.mtl",
        )

        const objLoader = new OBJLoader()
        objLoader.setMaterials(materials)
        return objLoader.parse(objContent)
      } catch (error) {
        return error as Error
      }
    }

    function loadUrl() {
      if (cache.has(url!)) {
        const cacheItem = cache.get(url!)!
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
        cache.set(url!, { ...cache.get(url!)!, result })
        return result
      })
      cache.set(url!, { promise, result: null })
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
