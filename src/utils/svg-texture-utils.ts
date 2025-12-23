import { circuitJsonToPcbSvg } from "circuit-to-svg"
import { Resvg, initWasm } from "@resvg/resvg-wasm"
import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"

let wasmInitialized = false

export async function initResvgWasm(): Promise<void> {
    if (wasmInitialized) return
    await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"))
    wasmInitialized = true
}

export async function svgToPngDataUrl(svgString: string): Promise<string> {
    if (!wasmInitialized) await initResvgWasm()
    const resvg = new Resvg(svgString, { font: { loadSystemFonts: false } })
    const pngBuffer = resvg.render().asPng()
    const base64 = btoa(Array.from(pngBuffer).map(b => String.fromCharCode(b)).join(""))
    return "data:image/png;base64," + base64
}

export async function createPcbTextureFromCircuitJson(
    circuitJson: AnyCircuitElement[],
    options: { layer?: "top" | "bottom" } = {}
  ): Promise<THREE.CanvasTexture | null> {
    try {
          const svgString = circuitJsonToPcbSvg(circuitJson, { layer: options.layer || "top" })
          const pngDataUrl = await svgToPngDataUrl(svgString)
          return new Promise((resolve, reject) => {
                  const img = new Image()
                  img.onload = () => {
                            const canvas = document.createElement("canvas")
                            canvas.width = img.width
                            canvas.height = img.height
                            canvas.getContext("2d")?.drawImage(img, 0, 0)
                            resolve(new THREE.CanvasTexture(canvas))
                  }
                  img.onerror = reject
                  img.src = pngDataUrl
          })
    } catch (e) { return null }
}
