import * as THREE from "three"

type CachedModelEntry = {
  promise: Promise<THREE.Object3D | Error>
  result: THREE.Object3D | null
}

export const normalizeModelCacheUrl = (url: string) =>
  url.replace(/&cachebust_origin=$/, "")

export function cloneCachedModel(model: THREE.Object3D): THREE.Object3D {
  const clone = model.clone(true)

  clone.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return

    node.geometry = node.geometry.clone()
    node.material = Array.isArray(node.material)
      ? node.material.map((material) => material.clone())
      : node.material.clone()
  })

  return clone
}

export class CachedModelLoader {
  private cache = new Map<string, CachedModelEntry>()

  async load(
    url: string,
    loadModel: (cleanUrl: string) => Promise<THREE.Object3D | Error>,
  ): Promise<THREE.Object3D | Error> {
    const cleanUrl = normalizeModelCacheUrl(url)
    const cached = this.cache.get(cleanUrl)

    if (cached) {
      if (cached.result) {
        return cloneCachedModel(cached.result)
      }

      const result = await cached.promise
      return result instanceof Error ? result : cloneCachedModel(result)
    }

    const promise = loadModel(cleanUrl).then((result) => {
      if (!(result instanceof Error)) {
        const entry = this.cache.get(cleanUrl)
        if (entry) {
          entry.result = result
        }
      }
      return result
    })

    this.cache.set(cleanUrl, { promise, result: null })

    const result = await promise
    return result instanceof Error ? result : cloneCachedModel(result)
  }

  clear() {
    this.cache.clear()
  }
}

export const globalModelLoader = new CachedModelLoader()
