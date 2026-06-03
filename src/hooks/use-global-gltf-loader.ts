import { useEffect, useState } from "react"
import { type Group, type Material, Mesh } from "three"
import { GLTFLoader, type GLTF } from "three-stdlib"

type CachedGltf = {
  promise: Promise<GLTF>
  result: GLTF | null
}

function getGltfLoaderCache(): Map<string, CachedGltf> {
  const globalScope = globalThis as {
    TSCIRCUIT_GLTF_LOADER_CACHE?: Map<string, CachedGltf>
  }

  if (!globalScope.TSCIRCUIT_GLTF_LOADER_CACHE) {
    globalScope.TSCIRCUIT_GLTF_LOADER_CACHE = new Map()
  }

  return globalScope.TSCIRCUIT_GLTF_LOADER_CACHE
}

function cloneGltfScene(gltf: GLTF): Group {
  const scene = gltf.scene.clone(true)

  scene.traverse((child) => {
    if (!(child instanceof Mesh)) return

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone())
    } else if (child.material) {
      child.material = (child.material as Material).clone()
    }
  })

  return scene
}

export function clearGlobalGltfLoaderCache(): void {
  getGltfLoaderCache().clear()
}

export async function loadCachedGltfScene(gltfUrl: string): Promise<Group> {
  const gltf = await loadGltf(gltfUrl)
  return cloneGltfScene(gltf)
}

function loadGltf(gltfUrl: string): Promise<GLTF> {
  const cache = getGltfLoaderCache()
  const cached = cache.get(gltfUrl)

  if (cached?.result) {
    return Promise.resolve(cached.result)
  }

  if (cached) {
    return cached.promise
  }

  const loader = new GLTFLoader()
  const promise = loader
    .loadAsync(gltfUrl)
    .then((gltf) => {
      const cacheItem = cache.get(gltfUrl)
      if (cacheItem) {
        cacheItem.result = gltf
      }
      return gltf
    })
    .catch((error) => {
      cache.delete(gltfUrl)
      throw error
    })

  cache.set(gltfUrl, { promise, result: null })
  return promise
}

export function useGlobalGltfLoader(
  gltfUrl: string | null,
): Group | null | Error {
  const [model, setModel] = useState<Group | null | Error>(null)

  useEffect(() => {
    let isActive = true
    setModel(null)

    if (!gltfUrl) return

    loadCachedGltfScene(gltfUrl)
      .then((scene) => {
        if (!isActive) return
        setModel(scene)
      })
      .catch((error) => {
        if (!isActive) return
        console.error(`An error happened loading ${gltfUrl}`, error)
        setModel(
          error instanceof Error
            ? error
            : new Error(`Failed to load glTF model from ${gltfUrl}`),
        )
      })

    return () => {
      isActive = false
    }
  }, [gltfUrl])

  return model
}
