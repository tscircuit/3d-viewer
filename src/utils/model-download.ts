import importer from "@tscircuit/internal-dynamic-import/source"
import type { CadComponent } from "circuit-json"
import { getCadModelType } from "./get-cad-model-type"
import { resolveModelUrl } from "./resolve-model-url"

export const modelDownloadFormats = ["GLB", "STEP", "x_t"] as const
export type ModelDownloadFormat = (typeof modelDownloadFormats)[number]

export function getModelDownloadAvailability(cad: CadComponent) {
  const type = getCadModelType(cad)
  const generated = type === "jscad" || type === "footprinter"
  return {
    GLB: type !== "unknown" && type !== "wrl",
    STEP: Boolean(cad.model_step_url) || generated,
    x_t: generated,
  }
}

// Export the source model, without its placement in the PCB assembly.
// Do not include pcb_board or unrelated components in a model download.
export function getStandaloneModel(
  cad: CadComponent,
  resolveStaticAsset?: (url: string) => string,
): CadComponent {
  const type = getCadModelType(cad)
  return {
    type: "cad_component",
    cad_component_id: cad.cad_component_id,
    source_component_id: cad.source_component_id,
    model_object_fit: "contain_within_bounds",
    anchor_alignment: "center",
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    layer: "top",
    // The converter and viewer have different fallback priorities. Pass only
    // the selected source so a secondary asset cannot replace the clicked model.
    model_glb_url:
      type === "glb"
        ? resolveModelUrl(cad.model_glb_url, resolveStaticAsset)
        : undefined,
    model_gltf_url:
      type === "gltf"
        ? resolveModelUrl(cad.model_gltf_url, resolveStaticAsset)
        : undefined,
    model_obj_url:
      type === "obj"
        ? resolveModelUrl(cad.model_obj_url, resolveStaticAsset)
        : undefined,
    model_stl_url:
      type === "stl"
        ? resolveModelUrl(cad.model_stl_url, resolveStaticAsset)
        : undefined,
    model_step_url:
      type === "step"
        ? resolveModelUrl(cad.model_step_url, resolveStaticAsset)
        : undefined,
    model_jscad: type === "jscad" ? cad.model_jscad : undefined,
    footprinter_string:
      type === "footprinter" ? cad.footprinter_string : undefined,
  }
}

async function fetchModel(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok)
    throw new Error(`Model download failed (${response.status})`)
  const blob = await response.blob()
  if (!blob.size) throw new Error("The model file is empty")
  return blob
}

export async function createModelDownload(
  cad: CadComponent,
  format: ModelDownloadFormat,
  resolveStaticAsset?: (url: string) => string,
): Promise<Blob> {
  if (!getModelDownloadAvailability(cad)[format]) {
    throw new Error(`${format} is unavailable for this model`)
  }
  if (format === "STEP" && cad.model_step_url) {
    return fetchModel(resolveModelUrl(cad.model_step_url, resolveStaticAsset)!)
  }
  if (format === "GLB") {
    if (cad.model_glb_url) {
      return fetchModel(resolveModelUrl(cad.model_glb_url, resolveStaticAsset)!)
    }
    const { convertCircuitJsonTo3D, convertSceneToGLTF } = await importer(
      "circuit-json-to-gltf",
    )
    const scene = await convertCircuitJsonTo3D(
      [getStandaloneModel(cad, resolveStaticAsset)],
      { drawFauxBoard: false, renderBoardTextures: false },
    )
    // Some loaders catch errors and produce a placeholder box. Never download
    // a successful-looking placeholder in place of the requested model.
    if (
      !scene.boxes.length ||
      scene.boxes.some((box) => !box.mesh?.triangles.length)
    ) {
      throw new Error("The model could not be converted to GLB")
    }
    const result = await convertSceneToGLTF(scene, { binary: true })
    if (!(result instanceof ArrayBuffer) || !result.byteLength) {
      throw new Error("The converter did not return a GLB file")
    }
    return new Blob([result], { type: "model/gltf-binary" })
  }

  const model =
    cad.model_jscad ?? (await getFootprintGeometry(cad.footprinter_string!))
  const text =
    format === "STEP"
      ? (await importer("jscad-to-step")).jscadToStep(model)
      : (await importer("jscad-to-parasolid")).jscadToParasolid(model)
  if (!text.trim()) throw new Error("The converter returned an empty model")
  return new Blob([text], { type: "application/octet-stream" })
}

async function getFootprintGeometry(footprint: string) {
  const [{ getJscadModelForFootprint }, modeling] = await Promise.all([
    import("jscad-electronics/vanilla"),
    import("@jscad/modeling"),
  ])
  const model = getJscadModelForFootprint(footprint, modeling)
  const geometries = model.geometries
    .flat(Infinity)
    .filter((entry: any) => entry.geom?.polygons?.length)
  if (!geometries.length) throw new Error("The model has no solid geometry")
  return { geometries }
}

export function saveModelDownload(
  blob: Blob,
  name: string,
  format: ModelDownloadFormat,
) {
  const filename = name.replace(/[^a-zA-Z0-9._-]/g, "_") || "model"
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.${format.toLowerCase()}`
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    // Let the browser start consuming the object URL before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
