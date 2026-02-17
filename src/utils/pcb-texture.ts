import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { initWasm, Resvg } from "@resvg/resvg-wasm"
import * as THREE from "three"

let resvgInitialized = false
let resvgInitPromise: Promise<void> | null = null

const RESVG_WASM_URL = "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"

async function ensureResvgInitialized(): Promise<void> {
  if (resvgInitialized) return
  if (resvgInitPromise) return resvgInitPromise

  resvgInitPromise = (async () => {
    try {
      await initWasm(RESVG_WASM_URL)
      resvgInitialized = true
    } catch (error) {
      resvgInitPromise = null
      throw error
    }
  })()

  return resvgInitPromise
}

/**
 * Converts circuit JSON to a PNG data URL via circuit-to-svg + resvg-wasm.
 */
export async function generatePcbTextureDataUrl(
  circuitJson: AnyCircuitElement[],
  options: { width?: number; height?: number } = {},
): Promise<string> {
  const { width = 2048, height = 2048 } = options

  const svgString = convertCircuitJsonToPcbSvg(circuitJson)

  await ensureResvgInitialized()

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
  options: { width?: number; height?: number } = {},
): Promise<THREE.Texture> {
  const url = await generatePcbTextureDataUrl(circuitJson, options)

  return new Promise<THREE.Texture>((resolve, reject) => {
    const loader = new THREE.TextureLoader()
    loader.load(
      url,
      (texture) => {
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
