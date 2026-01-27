import { useState, useEffect } from "react"
import type { Object3D } from "three"
import { MTLLoader, OBJLoader } from "three-stdlib"
import { loadVrml } from "src/utils/vrml"

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
    if (typeof window === "undefined") return

    const cleanUrl = url.split("&cachebust_origin=")[0] || url

    const cache = window.TSCIRCUIT_OBJ_LOADER_CACHE
    let cancelled = false

    async function loadAndParseObj(): Promise<Object3D | Error> {
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
        const objLoader = new OBJLoader()

        const mtlContentArr = text.match(/newmtl[\s\S]*?endmtl/g)

        if (mtlContentArr?.length) {
          const mtlContent = mtlContentArr.join("\n").replace(/d 0\./g, "d 1.")

          const objContent = text
            .replace(/newmtl[\s\S]*?endmtl/g, "")
            .replace(/^mtllib.*/gm, "")

          const mtlLoader = new MTLLoader()
          mtlLoader.setMaterialOptions({ invertTrProperty: true })

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

    function loadUrl(): Promise<Object3D | Error> {
      if (cache.has(cleanUrl)) {
        const cached = cache.get(cleanUrl)!
        if (cached.result) {
          return Promise.resolve(cached.result.clone())
        }

        return cached.promise.then((result) => {
          if (result instanceof Error) return result
          return result.clone()
        })
      }

      const promise = loadAndParseObj().then((result) => {
        if (!(result instanceof Error)) {
          cache.set(cleanUrl, { promise, result })
        }
        return result
      })

      cache.set(cleanUrl, { promise, result: null })
      return promise
    }

    loadUrl().then((result) => {
      if (!cancelled) {
        setObj(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [url])

  return obj
}
