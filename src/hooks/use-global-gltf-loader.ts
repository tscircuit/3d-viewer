import { useEffect, useState } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"

type GltfCacheItem = {
  promise: Promise<THREE.Group | Error>
  result: THREE.Group | Error | null
}

declare global {
  var TSCIRCUIT_GLTF_LOADER_CACHE: Map<string, GltfCacheItem> | undefined
}

function getGltfLoaderCache(): Map<string, GltfCacheItem> {
  if (!globalThis.TSCIRCUIT_GLTF_LOADER_CACHE) {
    globalThis.TSCIRCUIT_GLTF_LOADER_CACHE = new Map<string, GltfCacheItem>()
  }
  return globalThis.TSCIRCUIT_GLTF_LOADER_CACHE
}

function cloneLoadedGltf(result: THREE.Group | Error): THREE.Group | Error {
  if (result instanceof Error) {
    return result
  }
  return result.clone(true)
}

export function useGlobalGltfLoader(
  gltfUrl: string | null,
): THREE.Group | null | Error {
  const [model, setModel] = useState<THREE.Group | null | Error>(null)

  useEffect(() => {
    if (!gltfUrl) return

    let isActive = true
    const cache = getGltfLoaderCache()
    const cleanUrl = gltfUrl.replace(/&cachebust_origin=$/, "")

    const loadUrl = () => {
      const cached = cache.get(cleanUrl)
      if (cached) {
        if (cached.result) {
          return Promise.resolve(cloneLoadedGltf(cached.result))
        }
        return cached.promise.then(cloneLoadedGltf)
      }

      const loader = new GLTFLoader()
      const promise = loader
        .loadAsync(cleanUrl)
        .then((gltf) => {
          cache.set(cleanUrl, { ...cache.get(cleanUrl)!, result: gltf.scene })
          return gltf.scene
        })
        .catch((error) => {
          const err =
            error instanceof Error
              ? error
              : new Error(`Failed to load glTF model from ${cleanUrl}`)
          cache.set(cleanUrl, { ...cache.get(cleanUrl)!, result: err })
          return err
        })

      cache.set(cleanUrl, { promise, result: null })
      return promise.then(cloneLoadedGltf)
    }

    void loadUrl().then((result) => {
      if (!isActive) return
      setModel(result)
    })

    return () => {
      isActive = false
    }
  }, [gltfUrl])

  return model
}
