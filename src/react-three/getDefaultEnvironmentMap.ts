import * as THREE from "three"
import { RoomEnvironment } from "three-stdlib"

type RendererLike = THREE.WebGLRenderer | (Record<string, unknown> & object)

const environmentCache = new WeakMap<object, THREE.Texture>()

const createFallbackEnvironmentMap = () => {
  const texture = new THREE.Texture()
  texture.name = "fallback-environment-map"
  texture.mapping = THREE.EquirectangularReflectionMapping
  return texture
}

export const getDefaultEnvironmentMap = (
  renderer: RendererLike | null | undefined,
): THREE.Texture | null => {
  if (!renderer) return null

  const cacheKey = renderer as object
  const cached = environmentCache.get(cacheKey)
  if (cached) return cached

  let texture: THREE.Texture

  if (renderer instanceof THREE.WebGLRenderer) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    texture = pmremGenerator.fromScene(RoomEnvironment(), 0.04).texture
    pmremGenerator.dispose()
  } else {
    texture = createFallbackEnvironmentMap()
  }

  environmentCache.set(cacheKey, texture)
  return texture
}
