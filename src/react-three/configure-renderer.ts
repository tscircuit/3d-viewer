import * as THREE from "three"

/**
 * Applies renderer configuration that ensures GLTF/GLB assets are rendered
 * using the expected color space and tone mapping. Without this configuration
 * GLB assets can appear noticeably darker than intended.
 */
export const configureRenderer = (renderer: THREE.WebGLRenderer) => {
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  // Controls overall scene brightness for tone mapping
  renderer.toneMappingExposure = 1.2
}
