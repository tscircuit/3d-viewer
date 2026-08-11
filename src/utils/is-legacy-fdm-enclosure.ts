import type {
  AnyCircuitElement,
  CadComponent,
  PcbComponent,
} from "circuit-json"

/**
 * Recognize Core's pre-`cad_fdm_enclosure` compatibility representation.
 *
 * The generated enclosure is the only current CAD component whose PCB owner is
 * deliberately a do-not-place, off-board, non-obstructing placeholder and whose
 * exact JSCAD geometry is anchored at the outside floor. Core initially creates
 * that owner at zero size, then updates it to the resolved enclosure footprint,
 * so final width/height cannot be used as the discriminator. Keep this
 * structural adapter isolated so the later typed record migration deletes one
 * helper instead of spreading name/ID heuristics through the renderer.
 */
export const isLegacyFdmEnclosure = (
  cadComponent: CadComponent,
  circuitJson: AnyCircuitElement[],
): boolean => {
  if (
    !cadComponent.model_jscad ||
    cadComponent.model_origin_alignment !== "bottom_center_of_component"
  ) {
    return false
  }

  const pcbComponent = circuitJson.find(
    (element): element is PcbComponent =>
      element.type === "pcb_component" &&
      element.pcb_component_id === cadComponent.pcb_component_id,
  )

  return Boolean(
    pcbComponent &&
      pcbComponent.do_not_place &&
      pcbComponent.is_allowed_to_be_off_board &&
      pcbComponent.obstructs_within_bounds === false,
  )
}
