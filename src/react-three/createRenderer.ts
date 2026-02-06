import * as THREE from "three"
import type { RendererType } from "./ThreeContext"

export async function createRenderer(
  useWebGPU: boolean,
): Promise<RendererType> {
  if (useWebGPU) {
    const { default: WebGPURenderer } = await import(
      "three/examples/jsm/renderers/webgpu/WebGPURenderer.js"
    )
    const renderer = new WebGPURenderer({
      antialias: true,
      alpha: true,
    })
    await renderer.init()
    return renderer
  }

  return new THREE.WebGLRenderer({ antialias: true, alpha: true })
}
