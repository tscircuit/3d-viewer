export function getModelUrl(component: {
  model_obj_url?: string
  model_wrl_url?: string
  model_stl_url?: string
  footprinter_string?: string
}): string | undefined {
  return (
    component.model_obj_url ??
    component.model_wrl_url ??
    component.model_stl_url ??
    getKicadUrl(component.footprinter_string)
  )
}

function getKicadUrl(footprinter?: string): string | undefined {
  if (!footprinter) return undefined
  if (!footprinter.startsWith("kicad:")) return undefined
  const path = footprinter.replace(/^kicad:/, "").replace(/:/g, "/")
  return `https://kicad-mod-cache.tscircuit.com/${path}.wrl`
}
