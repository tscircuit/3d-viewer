import * as THREE from "three"
import type { RendererType, WebGPURenderer } from "./ThreeContext"

/**
 * Applies renderer configuration that ensures GLTF/GLB assets are rendered
 * using the expected color space and tone mapping. Without this configuration
 * GLB assets can appear noticeably darker than intended.
 */
export const configureRenderer = (renderer: RendererType) => {
  if (renderer instanceof THREE.WebGLRenderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
  } else {
    const gpuRenderer = renderer as WebGPURenderer
    gpuRenderer.outputColorSpace = THREE.SRGBColorSpace
    gpuRenderer.toneMapping = THREE.ACESFilmicToneMapping
    gpuRenderer.toneMappingExposure = 1
  }
}
