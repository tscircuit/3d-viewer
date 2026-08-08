import { useEffect, useState } from "react"
import { loadVrml } from "src/utils/vrml"
import type { Material, Object3D } from "three"
import { MTLLoader, OBJLoader } from "three-stdlib"

// Define the type for our cache
interface CacheItem {
  promise: Promise<Object3D | Error>
  result: Object3D | null
}

type ModelMeshLike = Object3D & {
  geometry?: unknown
  material?: Material | Material[]
}

const cloneMaterial = (material: Material | Material[] | undefined) => {
  if (Array.isArray(material)) {
    return material.map((item) => item.clone())
  }

  return material?.clone()
}

const cloneCachedModel = (model: Object3D) => {
  const clonedModel = model.clone(true)
  const sourceNodes: Object3D[] = []
  const clonedNodes: Object3D[] = []

  model.traverse((node) => sourceNodes.push(node))
  clonedModel.traverse((node) => clonedNodes.push(node))

  clonedNodes.forEach((clonedNode, index) => {
    const sourceNode = sourceNodes[index] as ModelMeshLike | undefined
    const clonedMesh = clonedNode as ModelMeshLike

    if (!sourceNode?.material || !("material" in clonedMesh)) return

    clonedMesh.geometry = sourceNode.geometry
    clonedMesh.material = cloneMaterial(sourceNode.material)
  })

  return clonedModel
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
          return Promise.resolve(cloneCachedModel(cacheItem.result))
        }
        // If we're still loading, return the existing promise
        return cacheItem.promise.then((result) => {
          if (result instanceof Error) return result
          return cloneCachedModel(result)
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
