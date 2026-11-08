import * as THREE from "three"

/** Bounds of rendered solids, after the authored motion has been applied. */
export function getVisibleSolidBounds(root: THREE.Object3D): THREE.Box3 | null {
  root.updateWorldMatrix(true, true)
  const bounds = new THREE.Box3()
  root.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material]
    if (
      !materials.some(
        (material) =>
          material.visible && (!material.transparent || material.opacity > 0),
      )
    )
      return
    let localBounds: THREE.Box3 | null
    if (object instanceof THREE.InstancedMesh) {
      object.computeBoundingBox()
      localBounds = object.boundingBox
    } else {
      object.geometry.computeBoundingBox()
      localBounds = object.geometry.boundingBox
    }
    if (localBounds && !localBounds.isEmpty()) {
      const worldBounds = localBounds.clone().applyMatrix4(object.matrixWorld)
      if (
        [...worldBounds.min.toArray(), ...worldBounds.max.toArray()].every(
          Number.isFinite,
        )
      )
        bounds.union(worldBounds)
    }
  })
  return bounds.isEmpty() ? null : bounds
}

/** Fit a bounding sphere without changing the user's viewing direction. */
export function fitExplosionCamera(
  camera: THREE.Camera,
  bounds: THREE.Box3,
  controls: {
    target: THREE.Vector3
    update: () => void
    enableDamping?: boolean
    autoRotate?: boolean
  } | null,
  padding = 1.18,
): THREE.Vector3 | null {
  if (
    bounds.isEmpty() ||
    ![...bounds.min.toArray(), ...bounds.max.toArray()].every(
      Number.isFinite,
    ) ||
    !(
      camera instanceof THREE.PerspectiveCamera ||
      camera instanceof THREE.OrthographicCamera
    )
  )
    return null

  const center = bounds.getCenter(new THREE.Vector3())
  const radius = Math.max(
    bounds.getSize(new THREE.Vector3()).length() / 2,
    0.001,
  )
  const paddedRadius = radius * Math.max(padding, 1)
  const direction = camera.getWorldDirection(new THREE.Vector3()).negate()
  const damping = controls?.enableDamping
  const autoRotate = controls?.autoRotate
  if (controls) {
    // Consume residual orbit/pan deltas without changing the visible pose.
    // Otherwise controls.update() can move the fitted target on later frames.
    const position = camera.position.clone()
    const quaternion = camera.quaternion.clone()
    const target = controls.target.clone()
    controls.enableDamping = false
    controls.autoRotate = false
    controls.update()
    camera.position.copy(position)
    camera.quaternion.copy(quaternion)
    controls.target.copy(target)
  }
  let distance: number
  if (camera instanceof THREE.PerspectiveCamera) {
    const halfVerticalFov =
      THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2
    const halfHorizontalFov = Math.atan(
      Math.tan(halfVerticalFov) * camera.aspect,
    )
    distance =
      paddedRadius / Math.sin(Math.min(halfVerticalFov, halfHorizontalFov))
  } else {
    const halfWidth = Math.abs(camera.right - camera.left) / 2
    const halfHeight = Math.abs(camera.top - camera.bottom) / 2
    camera.zoom = Math.min(halfWidth, halfHeight) / paddedRadius
    distance = paddedRadius * 2
  }
  camera.near = Math.min(camera.near, Math.max(0.0001, distance - paddedRadius))
  camera.far = Math.max(camera.far, distance + paddedRadius * 2)
  camera.position.copy(center).addScaledVector(direction, distance)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  if (controls) {
    controls.target.copy(center)
    controls.update()
    controls.enableDamping = damping
    controls.autoRotate = autoRotate
  }
  return center
}
