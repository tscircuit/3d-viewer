import * as THREE from "three"

/**
 * Creates a realistic FR4 edge texture (dark green with layered stripes)
 */
export function createSideBoardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 32
  canvas.height = 128
  const ctx = canvas.getContext("2d")
  if (!ctx) return new THREE.CanvasTexture(canvas)

  // Substrate base color (Dark Greenish-Brown FR4)
  ctx.fillStyle = "rgb(20, 40, 20)"
  ctx.fillRect(0, 0, 32, 128)

  // Layered stripes
  ctx.fillStyle = "rgba(40, 80, 40, 0.5)"
  for (let i = 0; i < 128; i += 8) {
    ctx.fillRect(0, i, 32, 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
  texture.needsUpdate = true
  return texture
}
