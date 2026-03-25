import type { CadComponent, CadModelFormat } from "circuit-json"

export type CadModelType = CadModelFormat | "footprinter" | "jscad" | "unknown"

export type RenderedCadModelType = Exclude<CadModelType, "step"> | "glb"

export const getCadModelType = (cadComponent: CadComponent): CadModelType => {
  if (cadComponent.model_glb_url || cadComponent.model_gltf_url) {
    return cadComponent.model_glb_url ? "glb" : "gltf"
  }

  if (
    cadComponent.model_obj_url ||
    cadComponent.model_wrl_url ||
    cadComponent.model_stl_url
  ) {
    if (cadComponent.model_wrl_url) return "wrl"
    if (cadComponent.model_stl_url) return "stl"
    return "obj"
  }

  if (cadComponent.model_step_url) return "step"

  if (cadComponent.model_jscad) return "jscad"
  if (cadComponent.footprinter_string) return "footprinter"
  return "unknown"
}

export const getRenderedCadModelType = (
  modelType: CadModelType,
): RenderedCadModelType => {
  // STEP assets are converted to GLB before rendering, so placement/origin math
  // must use the rendered GLB coordinate convention rather than raw STEP.
  return modelType === "step" ? "glb" : modelType
}
