import { useEffect, useState } from "react"
import {
  cloneObject3DWithIndependentMaterials,
  normalizeModelCacheKey,
} from "src/utils/load-model"
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

export function useGlobalObjLoader(
  url: string | null,
): Object3D | null | Error {
  const [obj, setObj] = useState<Object3D | null | Error>(null)

  useEffect(() => {
    if (!url) return

    const cleanUrl = normalizeModelCacheKey(url)

    const cache = window.TSCIRCUIT_OBJ_LOADER_CACHE
    let hasUrlChanged = false

    async function loadAndParseObj() {
      try {
        if (cleanUrl.endsWith(".wrl")) {
          return await loadVrml(cleanUrl)
        }

        const response = await fetch(cleanUrl)
        if (!response.ok) {
          throw new Error(
            `Failed to fetch "${cleanUrl}": ${response.status} ${response.statusText}`,
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
      if (cache.has(cleanUrl)) {
        const cacheItem = cache.get(cleanUrl)!
        if (cacheItem.result) {
          // If we have a result, clone it
          return Promise.resolve(
            cloneObject3DWithIndependentMaterials(cacheItem.result),
          )
        }
        // If we're still loading, return the existing promise
        return cacheItem.promise.then((result) => {
          if (result instanceof Error) return result
          return cloneObject3DWithIndependentMaterials(result)
        })
      }
      // If it's not in the cache, create a new promise and cache it
      const promise = loadAndParseObj().then((result) => {
        if (result instanceof Error) {
          cache.delete(cleanUrl)
          return result
        }
        cache.set(cleanUrl, { ...cache.get(cleanUrl)!, result })
        return result
      })
      cache.set(cleanUrl, { promise, result: null })
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
