export type LayerVisibility = {
  board: boolean
  platedHoles: boolean
  smtPads: boolean
  vias: boolean
  copperPours: boolean
  topTrace: boolean
  bottomTrace: boolean
  topSilkscreen: boolean
  bottomSilkscreen: boolean
  cadComponents: boolean
}

export const getPresentLayers = (circuitJson: any[]): Partial<LayerVisibility> => {
  const presentLayers: Partial<LayerVisibility> = {}

  // Always show board if there's a PCB
  if (circuitJson.some(e => e.type === "pcb_board")) {
    presentLayers.board = true
  }

  // Check for plated holes
  if (circuitJson.some(e => e.type === "pcb_plated_hole")) {
    presentLayers.platedHoles = true
  }

  // Check for SMT pads
  if (circuitJson.some(e => e.type === "pcb_smtpad")) {
    presentLayers.smtPads = true
  }

  // Check for vias
  if (circuitJson.some(e => e.type === "pcb_via")) {
    presentLayers.vias = true
  }

  // Check for copper pours
  if (circuitJson.some(e => e.type === "pcb_copper_pour")) {
    presentLayers.copperPours = true
  }

  // Check for traces (need to check route points for layer)
  const traces = circuitJson.filter(e => e.type === "pcb_trace")
  const hasTopTraces = traces.some(t =>
    t.route && t.route.some((point: any) => point.layer === "top")
  )
  const hasBottomTraces = traces.some(t =>
    t.route && t.route.some((point: any) => point.layer === "bottom")
  )
  if (hasTopTraces) {
    presentLayers.topTrace = true
  }
  if (hasBottomTraces) {
    presentLayers.bottomTrace = true
  }

  // Check for silkscreen
  const silkscreenTexts = circuitJson.filter(e =>
    e.type === "pcb_silkscreen_text" || e.type === "pcb_silkscreen_path"
  )
  if (silkscreenTexts.some(s => s.layer === "top")) {
    presentLayers.topSilkscreen = true
  }
  if (silkscreenTexts.some(s => s.layer === "bottom")) {
    presentLayers.bottomSilkscreen = true
  }

  // Check for CAD components
  if (circuitJson.some(e => e.type === "cad_component")) {
    presentLayers.cadComponents = true
  }

  return presentLayers
}