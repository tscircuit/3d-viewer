import { useEffect, useState } from "react"
import { loadVrml } from "src/utils/vrml"
import { type Material, Mesh, type Object3D } from "three"
import { MTLLoader, OBJLoader } from "three-stdlib"

// Define the type for our cache
interface CacheItem {
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

function removeCachebustOriginFallback(url: string): string {
  return url
    .replace(/([?&])cachebust_origin=[^&#]*&/g, "$1")
    .replace(/[?&]cachebust_origin=[^&#]*(?=#|$)/g, "")
    .replace(/\?&/, "?")
}

export function getGlobalObjLoaderCacheKey(url: string): string {
  try {
    const isAbsoluteUrl = /^[a-z][a-z\d+\-.]*:/i.test(url)
    const parsed = new URL(url, "https://tscircuit.local")
    parsed.searchParams.delete("cachebust_origin")
    if (isAbsoluteUrl) {
      return parsed.toString()
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return removeCachebustOriginFallback(url)
  }
}

function cloneMaterial(material: Material | Material[]): Material | Material[] {
  if (Array.isArray(material)) {
    return material.map((item) => item.clone())
  }
  return material.clone()
}

export function cloneObject3DForLoaderCache(object: Object3D): Object3D {
  const clone = object.clone(true)
  clone.traverse((child) => {
    if (child instanceof Mesh && child.material) {
      child.material = cloneMaterial(child.material)
    }
  })
  return clone
}

function cloneLoadedObject(result: Object3D | Error): Object3D | Error {
  if (result instanceof Error) {
    return result
  }
  return cloneObject3DForLoaderCache(result)
}

export function useGlobalObjLoader(
  url: string | null,
): Object3D | null | Error {
  const [obj, setObj] = useState<Object3D | null | Error>(null)

  useEffect(() => {
    if (!url) return

    const cleanUrl = getGlobalObjLoaderCacheKey(url)

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
          return Promise.resolve(cloneObject3DForLoaderCache(cacheItem.result))
        }
        return cacheItem.promise.then(cloneLoadedObject)
      }
      let promise: Promise<Object3D | Error>
      promise = loadAndParseObj()
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
          throw error
        })
      cache.set(cleanUrl, { promise, result: null })
      return promise.then(cloneLoadedObject)
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
