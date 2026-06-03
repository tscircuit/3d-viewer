import { useEffect, useState } from "react"
import type * as THREE from "three"
import { GLTFLoader } from "three-stdlib"
import { cloneObject3DWithMaterials } from "src/utils/clone-object3d-with-materials"

interface CacheItem {
  promise: Promise<THREE.Group | Error>
  result: THREE.Group | null
}

declare global {
  interface Window {
    TSCIRCUIT_GLTF_LOADER_CACHE: Map<string, CacheItem>
  }
}

if (typeof window !== "undefined" && !window.TSCIRCUIT_GLTF_LOADER_CACHE) {
  window.TSCIRCUIT_GLTF_LOADER_CACHE = new Map<string, CacheItem>()
}

export function useGlobalGltfLoader(
  url: string | null,
): THREE.Group | null | Error {
  const [model, setModel] = useState<THREE.Group | null | Error>(null)

  useEffect(() => {
    if (!url) return

    const cleanUrl = url.replace(/&cachebust_origin=$/, "")
    const cache = window.TSCIRCUIT_GLTF_LOADER_CACHE
    let hasUrlChanged = false

    async function loadAndParseGltf() {
      try {
        const loader = new GLTFLoader()
        const gltf = await loader.loadAsync(cleanUrl)
        return gltf.scene
      } catch (error) {
        return error instanceof Error
          ? error
          : new Error(`Failed to load glTF model from ${cleanUrl}`)
      }
    }

    function loadUrl() {
      if (cache.has(cleanUrl)) {
        const cacheItem = cache.get(cleanUrl)!
        if (cacheItem.result) {
          return Promise.resolve(cloneObject3DWithMaterials(cacheItem.result))
        }

        return cacheItem.promise.then((result) => {
          if (result instanceof Error) return result
          return cloneObject3DWithMaterials(result)
        })
      }

      const promise = loadAndParseGltf().then((result) => {
        if (result instanceof Error) return result
        cache.set(cleanUrl, { ...cache.get(cleanUrl)!, result })
        return cloneObject3DWithMaterials(result)
      })

      cache.set(cleanUrl, { promise, result: null })
      return promise
    }

    loadUrl()
      .then((result) => {
        if (hasUrlChanged) return
        setModel(result)
      })
      .catch((error) => {
        console.error(error)
      })

    return () => {
      hasUrlChanged = true
    }
  }, [url])

  return model
}
