import { useEffect, useState } from "react"
import { loadVrml } from "src/utils/vrml"
import type { Object3D } from "three"
import { MTLLoader, OBJLoader } from "three-stdlib"

export interface CacheItem {
  promise: Promise<Object3D | Error>
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

export function loadGlobalObjFromCache({
  cleanUrl,
  cache,
  loadModel,
}: {
  cleanUrl: string
  cache: Map<string, CacheItem>
  loadModel: () => Promise<Object3D | Error>
}): Promise<Object3D | Error> {
  if (cache.has(cleanUrl)) {
    const cacheItem = cache.get(cleanUrl)!
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

  let promise: Promise<Object3D | Error>
  promise = Promise.resolve()
    .then(loadModel)
    .then((result) => {
      if (result instanceof Error) {
        if (cache.get(cleanUrl)?.promise === promise) {
          cache.delete(cleanUrl)
        }
        return result
      }
      if (cache.get(cleanUrl)?.promise === promise) {
        cache.set(cleanUrl, { promise, result })
      }
      return result
    })
    .catch((error) => {
      if (cache.get(cleanUrl)?.promise === promise) {
        cache.delete(cleanUrl)
      }
      return error instanceof Error ? error : new Error(String(error))
    })

  cache.set(cleanUrl, { promise, result: null })
  return promise
}

export function useGlobalObjLoader(
  url: string | null,
): Object3D | null | Error {
  const [obj, setObj] = useState<Object3D | null | Error>(null)

  useEffect(() => {
    if (!url) return

    const cleanUrl = url.replace(/&cachebust_origin=$/, "")

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

    loadGlobalObjFromCache({
      cleanUrl,
      cache,
      loadModel: loadAndParseObj,
    })
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
