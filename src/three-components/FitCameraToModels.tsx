import { useMemo, type RefObject } from "react"
import * as THREE from "three"
import { useCameraController } from "../contexts/CameraControllerContext"
import { useFrame, useThree } from "../react-three/ThreeContext"
import { fitCameraToBounds } from "../reference-objects/fit-camera-to-bounds"

/** Initial framing for CAD assemblies that have no PCB bounds. */
export function FitCameraToModels({
  restoredCameraRef,
  userInteractedRef,
  enabled,
}: {
  restoredCameraRef: RefObject<THREE.Camera | null>
  userInteractedRef: RefObject<boolean>
  enabled: boolean
}) {
  const { camera, rootObject } = useThree()
  const { controlsRef } = useCameraController()
  const framing = useMemo(
    () => ({
      bounds: new THREE.Box3(),
      loaded: new Set<string>(),
      finished: false,
      awaitingControls: false,
    }),
    [camera, rootObject],
  )

  useFrame(() => {
    if (restoredCameraRef.current === camera) {
      framing.finished = true
      return
    }
    // Click-to-interact viewers can be framed before OrbitControls exists.
    // Hand the target to those controls without changing the fitted camera.
    if (framing.awaitingControls && controlsRef.current) {
      framing.bounds.getCenter(controlsRef.current.target)
      controlsRef.current.update()
      framing.awaitingControls = false
    }
    if (framing.finished) return
    if (userInteractedRef.current) {
      framing.finished = true
      return
    }
    if (!enabled) return

    rootObject.updateWorldMatrix(true, true)
    let pending = false
    let added = false
    rootObject.traverseVisible((group) => {
      const id = group.userData.cad_component_id ?? group.userData.cad_cable_id
      if (typeof id !== "string" || framing.loaded.has(id)) return
      const bounds = new THREE.Box3()
      // Ignore guide lines, labels, grids and other scene helpers. Use the
      // actual mesh transforms, including offsets baked into model geometry.
      group.traverseVisible((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.computeBoundingBox()
        if (object.geometry.boundingBox) {
          bounds.union(
            object.geometry.boundingBox
              .clone()
              .applyMatrix4(object.matrixWorld),
          )
        }
      })
      if (
        bounds.isEmpty() ||
        ![...bounds.min.toArray(), ...bounds.max.toArray()].every(
          Number.isFinite,
        )
      ) {
        pending = true
        return
      }
      framing.loaded.add(id)
      framing.bounds.union(bounds)
      added = true
    })

    if (added) {
      const { min, max } = framing.bounds
      fitCameraToBounds(camera, controlsRef.current, {
        minX: min.x,
        maxX: max.x,
        minY: min.y,
        maxY: max.y,
        minZ: min.z,
        maxZ: max.z,
      })
      framing.awaitingControls = !controlsRef.current
    }
    // A slow or failed model must not prevent framing the available geometry.
    // Once all mounted models are ready, stop observing later scene changes.
    if (framing.loaded.size && !pending) framing.finished = true
  }, [
    camera,
    rootObject,
    controlsRef,
    framing,
    enabled,
    restoredCameraRef,
    userInteractedRef,
  ])

  return null
}
