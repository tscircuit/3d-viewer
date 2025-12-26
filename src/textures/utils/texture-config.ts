import * as THREE from "three"

/**
 * Create a Three.js texture from canvas with optimized settings
 */
export function createOptimizedTexture(
  canvas: HTMLCanvasElement,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}

/**
 * Create canvas with specified dimensions
 */
export function createCanvas(
  boardOutlineBounds: { width: number; height: number },
  traceTextureResolution: number,
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas")
  const canvasWidth = Math.floor(
    boardOutlineBounds.width * traceTextureResolution,
  )
  const canvasHeight = Math.floor(
    boardOutlineBounds.height * traceTextureResolution,
  )
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  return canvas
}
