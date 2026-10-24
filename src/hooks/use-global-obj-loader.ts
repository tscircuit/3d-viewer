import { useEffect, useState } from "react"
import { loadVrml } from "src/utils/vrml"
import { Mesh, MeshStandardMaterial, type Object3D } from "three"
import { MTLLoader, OBJLoader, STLLoader } from "three-stdlib"

type ModelType = "stl" | "obj" | "wrl"
type ModelUrl = string

interface CacheItem {
  promise: Promise<Object3D | Error>
  result: Object3D | null
}

type ModelCache = Map<ModelUrl, CacheItem>

declare global {
  interface Window {
    TSCIRCUIT_OBJ_LOADER_CACHE: Map<ModelType, ModelCache>
  }
}

// Ensure the global cache exists
if (typeof window !== "undefined" && !window.TSCIRCUIT_OBJ_LOADER_CACHE) {
  window.TSCIRCUIT_OBJ_LOADER_CACHE = new Map<ModelType, ModelCache>()
}

export function useGlobalObjLoader(
  url: string | null,
  modelType: ModelType,
): Object3D | null | Error {
  const [obj, setObj] = useState<Object3D | null | Error>(null)

  useEffect(() => {
    if (!url) return

    const cleanUrl = url.replace(/&cachebust_origin=$/, "")
    const cachesByModelType = window.TSCIRCUIT_OBJ_LOADER_CACHE
    const cache =
      cachesByModelType.get(modelType) ?? new Map<ModelUrl, CacheItem>()
    cachesByModelType.set(modelType, cache)
    let hasUrlChanged = false

    async function loadAndParseModel() {
      try {
        if (modelType === "wrl") {
          return await loadVrml(cleanUrl)
        }

        const response = await fetch(cleanUrl)
        if (!response.ok) {
          throw new Error(
            `Failed to fetch "${cleanUrl}": ${response.status} ${response.statusText}`,
          )
        }
        if (modelType === "stl") {
          const geometry = new STLLoader().parse(await response.arrayBuffer())
          const material = new MeshStandardMaterial({ color: 0x888888 })
          return new Mesh(geometry, material)
        }
        const text = await response.text()

        const mtlContentArr = text.match(/newmtl[\s\S]*?endmtl/g)

        const objLoader = new OBJLoader()

        if (mtlContentArr?.length) {
          const mtlContent = mtlContentArr
            .join("\n")
            .replace(/^d\s+0\./gm, "d 1.")
          const objContent = text
            .replace(/newmtl[\s\S]*?endmtl/g, "")
            .replace(/^mtllib.*/gm, "")

          const mtlLoader = new MTLLoader()
          mtlLoader.setMaterialOptions({
            invertTrProperty: true,
          })
          const materials = mtlLoader.parse(mtlContent, "embedded.mtl")
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
          return Promise.resolve(cacheItem.result.clone())
        }
        // If we're still loading, return the existing promise
        return cacheItem.promise.then((result) => {
          if (result instanceof Error) return result
          return result.clone()
        })
      }
      // If it's not in the cache, create a new promise and cache it
      const promise = loadAndParseModel().then((result) => {
        if (result instanceof Error) {
          // If the result is an Error, return it
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
  }, [url, modelType])

  return obj
}
