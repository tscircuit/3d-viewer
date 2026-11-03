import type * as THREE from "three"
import { findModelObject } from "./find-model-object"

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
