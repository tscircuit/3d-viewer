import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import * as THREE from "three"

let wasmInitialized = false
let wasmInitPromise: Promise<void> | null = null
let ResvgClass: any = null

/**
 * Initialize resvg WASM module with proper error handling.
 * Uses dynamic imports to satisfy environment-specific loading requirements.
 */
export async function initializeResvg(): Promise<void> {
  if (wasmInitialized) return

  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      try {
        // Dynamic import of the module to handle WASM loading environments
        const resvgModule = await import("@resvg/resvg-wasm")

        // The init function is often exported as 'init' or 'initWasm'
        // depending on the library version; using the module's primary init.
        const initWasm = resvgModule.initWasm || (resvgModule as any).default

        // Store the Resvg class for use in generation
        ResvgClass = resvgModule.Resvg

        // Initialize WASM via the unpkg CDN
        await initWasm(
          fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"),
        )

        wasmInitialized = true
      } catch (error) {
        wasmInitPromise = null // Allow retry on failure
        throw new Error(
          `Failed to initialize resvg WASM: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    })()
  }

  await wasmInitPromise
}

/**
 * Generate PCB texture from circuit JSON.
 * Converts Circuit JSON -> SVG -> PNG -> Blob URL.
 */
export async function generatePcbTexture(
  circuitJson: AnyCircuitElement[],
  width = 1024,
  height = 1024,
): Promise<string> {
  // Ensure WASM is initialized before proceeding
  await initializeResvg()

  if (!ResvgClass) {
    throw new Error("Resvg class not initialized properly")
  }

  // Generate SVG string from circuit JSON
  const svgString = convertCircuitJsonToPcbSvg(circuitJson)

  if (!svgString) {
    throw new Error("Failed to generate SVG from circuit JSON")
  }

  // Convert SVG to PNG using resvg-wasm
  const resvg = new ResvgClass(svgString, {
    fitTo: {
      mode: "width",
      value: width,
    },
  })

  const pngBuffer = resvg.render()
  const pngData = pngBuffer.asPng()

  // Convert to Uint8Array and create a Blob URL for Three.js texture loading
  // This explicitly handles the 'BlobPart' type error by ensuring it's not a SharedArrayBuffer
  const uint8Array = new Uint8Array(pngData)
  const blob = new Blob([uint8Array], { type: "image/png" })

  return URL.createObjectURL(blob)
}

/**
 * Cleanup texture URL to prevent memory leaks.
 * Should be called when the component unmounts or the texture is no longer needed.
 */
export function cleanupTextureUrl(url: string | null): void {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url)
  }
}
