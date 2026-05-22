import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"

interface GltfCacheItem {
  promise: Promise<THREE.Group>
  result: THREE.Group | null
}

const gltfModelCache = new Map<string, GltfCacheItem>()

export const normalizeGltfModelUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url, globalThis.location?.href)
    if (parsedUrl.searchParams.get("cachebust_origin") === "") {
      parsedUrl.searchParams.delete("cachebust_origin")
    }

    if (/^[a-z][a-z\d+\-.]*:/i.test(url)) {
      return parsedUrl.toString()
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
  } catch {
    return url.replace(/([?&])cachebust_origin=$/, "")
  }
}

export const cloneGltfSceneForInstance = (scene: THREE.Group) => {
  const clonedScene = scene.clone(true)

  clonedScene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone())
    } else if (child.material) {
      child.material = child.material.clone()
    }
  })

  return clonedScene
}

export const disposeGltfModelInstance = (scene: THREE.Object3D) => {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    const material = child.material
    if (Array.isArray(material)) {
      for (const mat of material) {
        mat.dispose()
      }
    } else if (material) {
      material.dispose()
    }
  })
}

export const loadCachedGltfScene = async (
  gltfUrl: string,
  loader = new GLTFLoader(),
) => {
  const cacheKey = normalizeGltfModelUrl(gltfUrl)
  const cached = gltfModelCache.get(cacheKey)

  if (cached?.result) {
    return cloneGltfSceneForInstance(cached.result)
  }

  if (cached?.promise) {
    const scene = await cached.promise
    return cloneGltfSceneForInstance(scene)
  }

  const promise = loader
    .loadAsync(gltfUrl)
    .then((gltf) => {
      const scene = gltf.scene
      gltfModelCache.set(cacheKey, { promise, result: scene })
      return scene
    })
    .catch((error) => {
      gltfModelCache.delete(cacheKey)
      throw error
    })

  gltfModelCache.set(cacheKey, { promise, result: null })
  const scene = await promise
  return cloneGltfSceneForInstance(scene)
}

export const clearGltfModelCache = () => {
  gltfModelCache.clear()
}
