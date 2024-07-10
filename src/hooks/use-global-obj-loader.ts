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

export function useGlobalObjLoader(url: string | null): Group | null {
  const [obj, setObj] = useState<Group | null>(null)

  useEffect(() => {
    if (!url) return

    const cache = window.TSCIRCUIT_OBJ_LOADER_CACHE

    async function loadAndParseObj() {
      const response = await fetch(url!)
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
          "Kd $2 $2 $2"
        ),
        "test.mtl"
      )

      const objLoader = new OBJLoader()
      objLoader.setMaterials(materials)
      return objLoader.parse(objContent)
    }

    function loadUrl() {
      if (cache.has(url!)) {
        const cacheItem = cache.get(url!)!
        if (cacheItem.result) {
          // If we have a result, clone it
          return Promise.resolve(cacheItem.result.clone())
        }
        // If we're still loading, return the existing promise
        return cacheItem.promise.then((result) => result.clone())
      }
      // If it's not in the cache, create a new promise and cache it
      const promise = loadAndParseObj().then((result) => {
        cache.set(url!, { ...cache.get(url!)!, result })
        return result
      })
      cache.set(url!, { promise, result: null })
      return promise
    }

    loadUrl()
      .then((result) => {
        setObj(result)
      })
      .catch((error) => {
        console.error(error)
      })

    // Cleanup function
    return () => setObj(null)
  }, [url])

  return obj
}
