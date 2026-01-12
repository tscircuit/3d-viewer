import { renderCircuitToSvg } from "circuit-to-svg"
import initWasm, { Resvg } from "@resvg/resvg-wasm"
import type { AnyCircuitElement } from "circuit-json"

let wasmInitialized = false

/**
 * Initialize resvg-wasm
 */
export async function initializeResvg(): Promise<void> {
  if (!wasmInitialized) {
    await initWasm(
      fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm")
    )
    wasmInitialized = true
  }
}

/**
 * Generate PNG texture from circuit elements using circuit-to-svg and resvg-wasm
 * @param circuitElements - Array of circuit elements
 * @param width - Output width in pixels
 * @param height - Output height in pixels
 * @returns PNG data URL
 */
export async function generatePcbTexture(
  circuitElements: AnyCircuitElement[],
  width = 1024,
  height = 1024
): Promise<string> {
  try {
    // Initialize WASM if needed
    await initializeResvg()

    // Convert circuit to SVG
    const svgString = renderCircuitToSvg(circuitElements)

    // Convert SVG to PNG using resvg-wasm
    const resvg = new Resvg(svgString, {
      fitTo: {
        mode: "width",
        value: width,
      },
    })

    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

    // Convert to data URL
    const blob = new Blob([pngBuffer], { type: "image/png" })
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error("Error generating PCB texture:", error)
    throw new Error("Failed to generate PCB texture")
  }
}

/**
 * Clean up texture URL to prevent memory leaks
 * @param textureUrl - URL to revoke
 */
export function cleanupTextureUrl(textureUrl: string): void {
  if (textureUrl.startsWith("blob:")) {
    URL.revokeObjectURL(textureUrl)
  }
}
