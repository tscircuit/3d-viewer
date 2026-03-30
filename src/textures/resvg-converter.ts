/**
 * resvg-wasm integration for converting SVG to PNG
 * This module handles lazy loading of the wasm module and provides
 * a simple API for SVG to raster conversion.
 */

import { initWasm, Resvg } from "@resvg/resvg-wasm"

// URL for the resvg WASM binary (using jsdelivr CDN)
const RESVG_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm"

let resvgInitialized = false
let initializationPromise: Promise<void> | null = null

/**
 * Initialize the resvg-wasm module.
 * This should be called before using convertSvgToPng.
 */
export async function initResvgWasm(): Promise<void> {
  if (resvgInitialized) {
    return
  }

  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    try {
      await initWasm(RESVG_WASM_URL)
      resvgInitialized = true
    } catch (error) {
      console.error("Failed to initialize resvg-wasm:", error)
      throw error
    }
  })()

  return initializationPromise
}

/**
 * Check if resvg-wasm has been initialized
 */
export function isResvgInitialized(): boolean {
  return resvgInitialized
}

export interface ConvertSvgOptions {
  width?: number
  height?: number
  /**
   * Background color (default: transparent)
   */
  background?: string
  /**
   * Fit mode for SVG rendering
   * @default "width"
   */
  fitMode?: "width" | "height" | "original"
  /**
   * Crop mode
   * @default false
   */
  cropToViewport?: boolean
}

/**
 * Convert an SVG string to a PNG buffer using resvg-wasm.
 *
 * @param svgString - The SVG content as a string
 * @param options - Conversion options including width, height, and background
 * @returns Uint8Array containing PNG data
 *
 * @example
 * ```typescript
 * const pngBuffer = await convertSvgToPng(svgString, {
 *   width: 1024,
 *   height: 1024,
 *   background: "#ffffff"
 * });
 * ```
 */
export async function convertSvgToPng(
  svgString: string,
  options: ConvertSvgOptions = {},
): Promise<Uint8Array | null> {
  if (!resvgInitialized) {
    await initResvgWasm()
  }

  try {
    const { width, height, background, fitMode = "original" } = options

    // Create resvg instance with options
    const resvgOptions: Record<string, any> = {
      fitMode,
    }

    if (width !== undefined) {
      resvgOptions.width = width
    }
    if (height !== undefined) {
      resvgOptions.height = height
    }
    if (background !== undefined) {
      resvgOptions.background = background
    }

    const resvg = new Resvg(svgString, resvgOptions)
    const rendered = resvg.render()
    const pngData = rendered.asPng()

    return pngData
  } catch (error) {
    console.error("Error converting SVG to PNG:", error)
    return null
  }
}

/**
 * Convert SVG to raw pixel buffer (RGBA format).
 * This is useful for directly creating WebGL textures without the PNG encoding step.
 */
export async function convertSvgToRawPixels(
  svgString: string,
  options: ConvertSvgOptions = {},
): Promise<{
  pixels: Uint8Array
  width: number
  height: number
} | null> {
  if (!resvgInitialized) {
    await initResvgWasm()
  }

  try {
    const { width, height, background, fitMode = "original" } = options

    const resvgOptions: Record<string, any> = {
      fitMode,
    }

    if (width !== undefined) {
      resvgOptions.width = width
    }
    if (height !== undefined) {
      resvgOptions.height = height
    }
    if (background !== undefined) {
      resvgOptions.background = background
    }

    const resvg = new Resvg(svgString, resvgOptions)

    // Get the rendered size
    const bbox = resvg.getBBox()
    const outputWidth = width ?? Math.ceil(bbox?.width ?? 512)
    const outputHeight = height ?? Math.ceil(bbox?.height ?? 512)

    // Render to PNG first
    const rendered = resvg.render()
    const pngBuffer = rendered.asPng()

    // Decode PNG to raw pixels using canvas
    const arrayBuffer = pngBuffer.buffer.slice(
      pngBuffer.byteOffset,
      pngBuffer.byteOffset + pngBuffer.byteLength,
    ) as ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: "image/png" })
    const bitmap = await createImageBitmap(blob)

    const canvas = document.createElement("canvas")
    canvas.width = outputWidth
    canvas.height = outputHeight
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Failed to get 2D context")
    }

    ctx.drawImage(bitmap, 0, 0)
    const imageData = ctx.getImageData(0, 0, outputWidth, outputHeight)

    bitmap.close()

    return {
      pixels: Uint8Array.from(imageData.data),
      width: outputWidth,
      height: outputHeight,
    }
  } catch (error) {
    console.error("Error converting SVG to raw pixels:", error)
    return null
  }
}

/**
 * Preload the resvg-wasm module.
 * Call this early in your application to ensure the WASM is loaded before use.
 */
export function preloadResvgWasm(): void {
  if (!resvgInitialized && !initializationPromise) {
    initResvgWasm().catch((error) => {
      console.warn("Preload of resvg-wasm failed:", error)
    })
  }
}
