import * as THREE from "three"
import type { ThreeContextState } from "../react-three/ThreeContext"

export const pickVisibleMesh = (
  scene: Pick<ThreeContextState, "camera" | "rootObject" | "renderer"> | null,
  position: { x: number; y: number },
): THREE.Mesh | undefined => {
  if (!scene) return
  const { camera, rootObject, renderer } = scene
  const rect = renderer.domElement.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  if (
    position.x < rect.left ||
    position.x > rect.right ||
    position.y < rect.top ||
    position.y > rect.bottom
  )
    return
  const raycaster = new THREE.Raycaster()
  camera.updateWorldMatrix(true, false)
  rootObject.updateWorldMatrix(true, true)
  raycaster.setFromCamera(
    new THREE.Vector2(
      ((position.x - rect.left) / rect.width) * 2 - 1,
      -((position.y - rect.top) / rect.height) * 2 + 1,
    ),
    camera,
  )
  for (const hit of raycaster.intersectObject(rootObject, true)) {
    if (!(hit.object instanceof THREE.Mesh)) continue
    let object: THREE.Object3D | null = hit.object
    let visible = true
    while (object) {
      if (!object.visible) visible = false
      object = object.parent
    }
    if (visible) return hit.object
  }
}
