export type LayerVisibility = {
  board: boolean
  fCu: boolean
  bCu: boolean
  fSilkscreen: boolean
  bSilkscreen: boolean
  cadComponents: boolean
}

export const getPresentLayers = (
  circuitJson: any[],
): Partial<LayerVisibility> => {
  const presentLayers: Partial<LayerVisibility> = {}

  // Always show board if there's a PCB
  if (circuitJson.some((e) => e.type === "pcb_board")) {
    presentLayers.board = true
  }

  // Check for traces (need to check route points for layer)
  const traces = circuitJson.filter((e) => e.type === "pcb_trace")
  const hasTopTraces = traces.some(
    (t) => t.route && t.route.some((point: any) => point.layer === "top"),
  )
  const hasBottomTraces = traces.some(
    (t) => t.route && t.route.some((point: any) => point.layer === "bottom"),
  )
  if (hasTopTraces) {
    presentLayers.fCu = true
  }
  if (hasBottomTraces) {
    presentLayers.bCu = true
  }

  // Add detection for pads and vias
  const smtPads = circuitJson.filter((e) => e.type === "pcb_smtpad")
  if (smtPads.some((p) => p.layer === "top")) {
    presentLayers.fCu = true
  }
  if (smtPads.some((p) => p.layer === "bottom")) {
    presentLayers.bCu = true
  }
  // Also check for vias
  if (
    circuitJson.some(
      (e) => e.type === "pcb_via" || e.type === "pcb_plated_hole",
    )
  ) {
    presentLayers.fCu = true
    presentLayers.bCu = true
  }

  // Check for silkscreen
  const silkscreenTexts = circuitJson.filter(
    (e) => e.type === "pcb_silkscreen_text" || e.type === "pcb_silkscreen_path",
  )
  if (silkscreenTexts.some((s) => s.layer === "top")) {
    presentLayers.fSilkscreen = true
  }
  if (silkscreenTexts.some((s) => s.layer === "bottom")) {
    presentLayers.bSilkscreen = true
  }

  // Check for CAD components
  if (circuitJson.some((e) => e.type === "cad_component")) {
    presentLayers.cadComponents = true
  }

  return presentLayers
}
