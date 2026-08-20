const clampChannel = (value: number) => Math.max(0, Math.min(255, value))

/**
 * Adds the subtle directional variation used by the board surface material.
 *
 * This deliberately runs on the isolated soldermask texture. Applying the
 * same effect after compositing would recolor silkscreen or exposed copper
 * whenever a custom soldermask happens to use a similar color.
 */
export const applySoldermaskSurfaceFilter = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: { includeReflection?: boolean } = {},
) => {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const maxX = Math.max(width - 1, 1)
  const maxY = Math.max(height - 1, 1)

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] ?? 0
    if (alpha < 16) continue

    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    const pixelIndex = i / 4
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)
    const u = x / maxX
    const v = y / maxY
    const diagonalLight = u * 0.62 + (1 - v) * 0.38
    const broadVariation = Math.sin((u * 1.15 + v * 0.35) * Math.PI) * 0.02
    const lightFactor = 0.86 + diagonalLight * 0.12 + broadVariation

    const whiteReflection = options.includeReflection
      ? (() => {
          const reflectionX = 0.36
          const reflectionY = 0.22
          const dx = u - reflectionX
          const dy = v - reflectionY
          const radialFalloff = Math.max(0, 1 - Math.hypot(dx, dy) / 0.38)
          return radialFalloff * radialFalloff * 0.07
        })()
      : 0

    data[i] = clampChannel(
      r * lightFactor * (1 - whiteReflection) + 255 * whiteReflection,
    )
    data[i + 1] = clampChannel(
      g * lightFactor * (1 - whiteReflection) + 255 * whiteReflection,
    )
    data[i + 2] = clampChannel(
      b * lightFactor * (1 - whiteReflection) + 255 * whiteReflection,
    )
  }

  ctx.putImageData(imageData, 0, 0)
}
