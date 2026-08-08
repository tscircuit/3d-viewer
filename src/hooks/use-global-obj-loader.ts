import { useState, useEffect } from "react"
import type { Object3D } from "three"
import { MTLLoader, OBJLoader } from "three-stdlib"
import { loadVrml } from "src/utils/vrml"

// Define the type for our cache
interface CacheItem {
  promise: Promise<Object3D | Error>
  result: Object3D | null
}

const cloneLoadedObject = (object: Object3D) => {
  const clonedObject = object.clone(true)
  const sourceChildren: Object3D[] = []
  const clonedChildren: Object3D[] = []

  object.traverse((child) => sourceChildren.push(child))
  clonedObject.traverse((child) => clonedChildren.push(child))

  clonedChildren.forEach((child, index) => {
    const sourceChild = sourceChildren[index]

    if (!sourceChild || !("geometry" in child) || !("material" in child)) return

    const sourceMesh = sourceChild as {
      geometry?: unknown
      material?: unknown
    }
    const clonedMesh = child as {
      geometry?: unknown
      material?: unknown
    }

    clonedMesh.geometry = sourceMesh.geometry

    if (Array.isArray(sourceMesh.material)) {
      clonedMesh.material = sourceMesh.material.map((material) =>
        material && typeof material === "object" && "clone" in material
          ? (material.clone as () => unknown)()
          : material,
      )
    } else if (
      sourceMesh.material &&
      typeof sourceMesh.material === "object" &&
      "clone" in sourceMesh.material
    ) {
      clonedMesh.material = (sourceMesh.material.clone as () => unknown)()
    } else {
      clonedMesh.material = sourceMesh.material
    }
  })

  return clonedObject
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

    const cleanUrl = url.replace(/&cachebust_origin=$/, "")

    const cache = window.TSCIRCUIT_OBJ_LOADER_CACHE
    let hasUrlChanged = false

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
          // If we have a result, clone it without duplicating immutable geometry buffers.
          return Promise.resolve(cloneLoadedObject(cacheItem.result))
        }
        // If we're still loading, return the existing promise
        return cacheItem.promise.then((result) => {
          if (result instanceof Error) return result
          return cloneLoadedObject(result)
        })
      }
      // If it's not in the cache, create a new promise and cache it
      const promise = loadAndParseObj().then((result) => {
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
  }, [url])

  return obj
}
