import * as THREE from "three"

export { createCopperLayerTexture } from "./create-copper-layer-texture"
export { createTextureMeshes } from "./create-three-texture-meshes"

// Utility exports
export {
  createCoordinateTransform,
  setupBottomLayerContext,
  drawPolygon,
  drawBrepShape,
} from "./utils/coordinate-transform"
export { getCopperColor, getCircuitToCanvasColors } from "./utils/colors"
export { createOptimizedTexture, createCanvas } from "./utils/texture-config"
export { drawPadShape } from "./drawing/pad-drawer"
export { drawRectAndPolygonPours } from "./adapters/circuit-to-canvas-adapter"

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
