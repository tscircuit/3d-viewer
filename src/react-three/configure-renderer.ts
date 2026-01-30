import * as THREE from "three"
import type { RendererType } from "./ThreeContext"

interface ConfigurableRenderer {
  outputColorSpace: THREE.ColorSpace
  toneMapping: THREE.ToneMapping
  toneMappingExposure: number
}

function isConfigurableRenderer(
  renderer: RendererType,
): renderer is RendererType & ConfigurableRenderer {
  return (
    "outputColorSpace" in renderer &&
    "toneMapping" in renderer &&
    "toneMappingExposure" in renderer
  )
}

/**
 * Applies renderer configuration that ensures GLTF/GLB assets are rendered
 * using the expected color space and tone mapping. Without this configuration
 * GLB assets can appear noticeably darker than intended.
 */
export function configureRenderer(renderer: RendererType): void {
  if (isConfigurableRenderer(renderer)) {
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
  }
}
