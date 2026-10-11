import * as THREE from "three"
import type { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

interface GetMinimumDollyDistanceOptions {
  camera: THREE.PerspectiveCamera
  initialOrbitDistance: number
}

interface ApplyInfiniteDollyOptions {
  camera: THREE.Camera
  controls: ThreeOrbitControls
  minimumDollyDistance: number
}

// Preserve normal orbiting through 95% of the initial framing distance, then
// retain enough scene-relative distance for continued fixed-speed travel.
const MINIMUM_DOLLY_DISTANCE_RATIO = 0.05

export const getMinimumDollyDistance = ({
  camera,
  initialOrbitDistance,
}: GetMinimumDollyDistanceOptions) => {
  const scaledInitialOrbitDistance = Number.isFinite(initialOrbitDistance)
    ? initialOrbitDistance * MINIMUM_DOLLY_DISTANCE_RATIO
    : 0

  return Math.max(scaledInitialOrbitDistance, camera.near, Number.EPSILON)
}

/**
 * Keep dollying after OrbitControls reaches its target. At the minimum useful
 * orbit distance, move the target forward on the current view ray. The camera
 * stays still until OrbitControls applies the next input, preserving its
 * cursor-centered behavior while preventing the dolly speed from collapsing.
 */
export const applyInfiniteDolly = ({
  camera,
  controls,
  minimumDollyDistance,
}: ApplyInfiniteDollyOptions) => {
  if (!(camera instanceof THREE.PerspectiveCamera)) return false

  const orbitDistance = controls.getDistance()
  if (Number.isFinite(orbitDistance) && orbitDistance >= minimumDollyDistance) {
    return false
  }

  const viewDirection = new THREE.Vector3()
  camera.getWorldDirection(viewDirection)
  controls.target
    .copy(camera.position)
    .addScaledVector(viewDirection, minimumDollyDistance)

  return true
}
