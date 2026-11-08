import type { AssemblyExplosionView } from "@tscircuit/core"
import * as THREE from "three"

/** Translate authored paths from CAD origins to the rendered model centers. */
export function getAssemblyGuidePoints(
  root: THREE.Object3D,
  view: AssemblyExplosionView,
) {
  const targets = new Set(view.lines.map((line) => line.targetRef))
  const positions = new Map(
    view.circuitJson.flatMap((element) =>
      element.type === "cad_component"
        ? [[element.cad_component_id, element.position] as const]
        : [],
    ),
  )
  const corrections = new Map<string, THREE.Vector3>()
  root.updateWorldMatrix(true, true)
  const rootInverse = root.matrixWorld.clone().invert()
  const box = new THREE.Box3()
  const meshBox = new THREE.Box3()
  const transform = new THREE.Matrix4()
  root.traverse((group) => {
    const id = group.userData.cad_component_id
    const position = positions.get(id)
    if (!targets.has(id) || !position) return
    box.makeEmpty()
    group.traverse((object) => {
      // Ignore helper lines and sprites. Geometry bounding boxes are cached by
      // Three, so this never scans model vertices after the first calculation.
      if (!(object instanceof THREE.Mesh)) return
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox()
      if (!object.geometry.boundingBox) return
      transform.multiplyMatrices(rootInverse, object.matrixWorld)
      meshBox.copy(object.geometry.boundingBox).applyMatrix4(transform)
      box.union(meshBox)
    })
    if (box.isEmpty()) return // Wait for asynchronous model loading.
    corrections.set(
      id,
      box
        .getCenter(new THREE.Vector3())
        .sub(new THREE.Vector3(position.x, position.y, position.z)),
    )
  })
  const points: THREE.Vector3[] = []
  for (const line of view.lines) {
    const correction = corrections.get(line.targetRef)
    if (!correction) continue // Hidden or not-yet-loaded components have no guide.
    for (let i = 1; i < line.points.length; i++) {
      for (const point of [line.points[i - 1]!, line.points[i]!])
        points.push(
          new THREE.Vector3(point.x, point.y, point.z).add(correction),
        )
    }
  }
  return points
}
