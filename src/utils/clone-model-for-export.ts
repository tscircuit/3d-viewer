import type * as THREE from "three"

/** Scene node of a picked model (CAD component or cable). The board is not a
 * model, so a picked pcb_board_id/pcb_panel_id finds nothing. */
export const findModelObject = (
  root: THREE.Object3D,
  objectId: string,
): THREE.Object3D | undefined => {
  // traverse is depth-first, so the first match is the outermost model node.
  let model: THREE.Object3D | undefined
  root.traverse((object) => {
    const { cad_component_id, cad_cable_id } = object.userData
    if (!model && (cad_component_id ?? cad_cable_id) === objectId)
      model = object
  })
  return model
}

/** Clone one model out of the scene for export. The clone keeps its world
 * placement so it lines up with a full scene export. Geometry and materials
 * are shared with the scene, not copied. */
export const cloneModelForExport = (
  root: THREE.Object3D,
  objectId: string,
): THREE.Object3D | undefined => {
  const source = findModelObject(root, objectId)
  if (!source) return
  source.updateWorldMatrix(true, true)
  const output = source.clone(true)
  source.matrixWorld.decompose(output.position, output.quaternion, output.scale)
  return output
}
