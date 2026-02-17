import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { initWasm, Resvg } from "@resvg/resvg-wasm"
import * as THREE from "three"

let resvgInitialized = false
let resvgInitPromise: Promise<void> | null = null

/**
 * Resolves the resvg WASM binary. Tries to use the local copy bundled with
 * @resvg/resvg-wasm first (works in bundlers that handle .wasm assets).
 * Falls back to fetching from unpkg CDN as a last resort.
 */
async function resolveWasmModule(): Promise<ArrayBuffer | string> {
  try {
    // Dynamic import – bundlers like vite/webpack can resolve .wasm assets
    // from node_modules when referenced with ?url or direct path.
    const wasmUrl = new URL(
      "@resvg/resvg-wasm/index_bg.wasm",
      import.meta.url,
    ).href
    const resp = await fetch(wasmUrl)
    if (resp.ok) return resp.arrayBuffer()
  } catch {
    // ignore – fall through to CDN fallback
  }

  // Fallback: CDN URL (pinned version matching the installed package)
  return "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"
}

async function ensureResvgInitialized(): Promise<void> {
  if (resvgInitialized) return
  if (resvgInitPromise) return resvgInitPromise

  resvgInitPromise = (async () => {
    try {
      const wasmSource = await resolveWasmModule()
      await initWasm(wasmSource)
      resvgInitialized = true
    } catch (error) {
      resvgInitPromise = null
      throw error
    }
  })()

  return resvgInitPromise
}

/**
 * Extracts the SVG viewBox dimensions to determine the board aspect ratio.
 * Returns { width, height } from the viewBox or falls back to defaults.
 */
function parseSvgAspectRatio(svgString: string): {
  width: number
  height: number
} {
  // Try viewBox first (most reliable)
  const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/)
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] }
    }
  }

  // Try explicit width/height attributes
  const wMatch = svgString.match(/\bwidth="([\d.]+)"/)
  const hMatch = svgString.match(/\bheight="([\d.]+)"/)
  if (wMatch && hMatch) {
    const w = Number(wMatch[1])
    const h = Number(hMatch[1])
    if (w > 0 && h > 0) return { width: w, height: h }
  }

  return { width: 1, height: 1 }
}

/**
 * Computes texture dimensions that respect the board aspect ratio while
 * staying within a maximum pixel budget (maxDim × maxDim).
 */
function computeTextureDimensions(
  svgWidth: number,
  svgHeight: number,
  maxDim = 2048,
): { width: number; height: number } {
  const aspect = svgWidth / svgHeight
  let w: number
  let h: number

  if (aspect >= 1) {
    w = maxDim
    h = Math.round(maxDim / aspect)
  } else {
    h = maxDim
    w = Math.round(maxDim * aspect)
  }

  // Clamp to at least 1px
  w = Math.max(1, w)
  h = Math.max(1, h)

  return { width: w, height: h }
}

/**
 * Converts circuit JSON to a PNG data URL via circuit-to-svg + resvg-wasm.
 * The texture dimensions now respect the board aspect ratio instead of
 * being hardcoded to a square.
 */
export async function generatePcbTextureDataUrl(
  circuitJson: AnyCircuitElement[],
  options: { width?: number; height?: number; maxDim?: number } = {},
): Promise<string> {
  const svgString = convertCircuitJsonToPcbSvg(circuitJson)

  await ensureResvgInitialized()

  // Determine proper dimensions from the SVG aspect ratio
  const svgDims = parseSvgAspectRatio(svgString)
  const { width: defaultW, height: defaultH } = computeTextureDimensions(
    svgDims.width,
    svgDims.height,
    options.maxDim ?? 2048,
  )

  const width = options.width ?? defaultW
  const height = options.height ?? defaultH

  const resvg = new Resvg(svgString, {
    fitTo: { mode: "width" as const, value: width },
  })

  const rendered = resvg.render()
  const pngBuffer = rendered.asPng()

  const blob = new Blob([new Uint8Array(pngBuffer)], { type: "image/png" })
  const url = URL.createObjectURL(blob)
  return url
}

/**
 * Creates a Three.js texture from circuit JSON for applying to the PCB board mesh.
 */
export async function createPcbTexture(
  circuitJson: AnyCircuitElement[],
  options: { width?: number; height?: number; maxDim?: number } = {},
): Promise<THREE.Texture> {
  const url = await generatePcbTextureDataUrl(circuitJson, options)

  return new Promise<THREE.Texture>((resolve, reject) => {
    const loader = new THREE.TextureLoader()
    loader.load(
      url,
      (texture) => {
        // Revoke the blob URL after the texture has been loaded successfully
        URL.revokeObjectURL(url)

        texture.colorSpace = THREE.SRGBColorSpace
        texture.generateMipmaps = true
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.anisotropy = 16
        texture.needsUpdate = true
        resolve(texture)
      },
      undefined,
      (error) => {
        URL.revokeObjectURL(url)
        reject(error)
      },
    )
  })
}
