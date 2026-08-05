import type * as THREE from "three"

export const hidePreviewOnlyObjects = (root: THREE.Object3D): (() => void) => {
  const visibilityStates: Array<{ object: THREE.Object3D; visible: boolean }> =
    []

  root.traverse((object) => {
    if (!object.userData.previewOnly) return
    visibilityStates.push({ object, visible: object.visible })
    object.visible = false
  })

  return () => {
    for (const { object, visible } of visibilityStates) {
      object.visible = visible
    }
  }
}
