/** Viewer-local visibility of pickable scene objects, keyed by their
 * cad_component_id, cad_cable_id, or rendered pcb_board_id/pcb_panel_id. */
export interface ObjectVisibility {
  hiddenIds: ReadonlySet<string>
  /** Hides every other object, including geometry without an object id. */
  isolatedId?: string
}

export const ALL_OBJECTS_VISIBLE: ObjectVisibility = { hiddenIds: new Set() }

export const isObjectHidden = (
  visibility: ObjectVisibility | undefined,
  id: string | undefined,
) => {
  if (!visibility) return false
  if (id !== undefined && visibility.hiddenIds.has(id)) return true
  return visibility.isolatedId !== undefined && visibility.isolatedId !== id
}

export const hasHiddenObjects = (visibility: ObjectVisibility) =>
  visibility.hiddenIds.size > 0 || visibility.isolatedId !== undefined
