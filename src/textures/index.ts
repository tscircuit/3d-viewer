import * as THREE from "three"

export { createCopperPourTextureForLayer } from "./create-copper-pour-texture-for-layer"
export { createTextureMeshes } from "./create-three-texture-meshes"

export interface LayerTextures {
  topTrace?: THREE.CanvasTexture | null
  bottomTrace?: THREE.CanvasTexture | null
  topTraceWithMask?: THREE.CanvasTexture | null
  bottomTraceWithMask?: THREE.CanvasTexture | null
  topSilkscreen?: THREE.CanvasTexture | null
  bottomSilkscreen?: THREE.CanvasTexture | null
  topSoldermask?: THREE.CanvasTexture | null
  bottomSoldermask?: THREE.CanvasTexture | null
  topCopperText?: THREE.CanvasTexture | null
  bottomCopperText?: THREE.CanvasTexture | null
  topPanelOutlines?: THREE.CanvasTexture | null
  bottomPanelOutlines?: THREE.CanvasTexture | null
  topCopper?: THREE.CanvasTexture | null
  bottomCopper?: THREE.CanvasTexture | null
}
