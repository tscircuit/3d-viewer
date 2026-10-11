import React, { useEffect, useMemo } from "react"
import * as THREE from "three"
import { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { applyInfiniteDolly, getMinimumDollyDistance } from "./infinite-dolly"
import { useFrame, useThree } from "./ThreeContext"

interface OrbitControlsProps {
  autoRotate?: boolean
  autoRotateSpeed?: number
  onStart?: () => void
  panSpeed?: number
  rotateSpeed?: number
  zoomSpeed?: number
  enableDamping?: boolean
  dampingFactor?: number
  target?: [number, number, number]
  onControlsChange?: (controls: ThreeOrbitControls | null) => void
}

export const OrbitControls: React.FC<OrbitControlsProps> = ({
  autoRotate,
  autoRotateSpeed,
  onStart,
  panSpeed,
  rotateSpeed,
  zoomSpeed,
  enableDamping,
  dampingFactor,
  target,
  onControlsChange,
}) => {
  const { camera, renderer } = useThree()

  const controls = useMemo(() => {
    if (!camera || !renderer) return null
    return new ThreeOrbitControls(camera, renderer.domElement)
  }, [camera, renderer])

  const minimumDollyDistance = useMemo(() => {
    if (!controls || !(camera instanceof THREE.PerspectiveCamera)) {
      return Number.EPSILON
    }

    const initialOrbitDistance = target
      ? Math.hypot(
          camera.position.x - target[0],
          camera.position.y - target[1],
          camera.position.z - target[2],
        )
      : controls.getDistance()

    return getMinimumDollyDistance({ camera, initialOrbitDistance })
  }, [camera, controls, target])

  useEffect(() => {
    onControlsChange?.(controls ?? null)
    return () => onControlsChange?.(null)
  }, [controls, onControlsChange])

  useEffect(() => {
    if (!controls) return

    const handleChange = () => {
      onControlsChange?.(controls)
    }

    controls.addEventListener("change", handleChange)

    return () => {
      controls.removeEventListener("change", handleChange)
    }
  }, [controls, onControlsChange])

  useEffect(() => {
    if (!controls) return

    controls.autoRotate = autoRotate || false
    controls.autoRotateSpeed = autoRotateSpeed || 1.0
    if (panSpeed !== undefined) controls.panSpeed = panSpeed
    if (rotateSpeed !== undefined) controls.rotateSpeed = rotateSpeed
    if (zoomSpeed !== undefined) controls.zoomSpeed = zoomSpeed
    if (enableDamping !== undefined) controls.enableDamping = enableDamping
    if (dampingFactor !== undefined) controls.dampingFactor = dampingFactor

    controls.zoomToCursor = true

    // Configure mouse button mapping
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE, // Left click to rotate
      MIDDLE: THREE.MOUSE.PAN, // Middle click to pan
      RIGHT: null, // Right-click always disabled - only context menu
    }

    if (target) {
      controls.target.set(target[0], target[1], target[2])
      controls.update()
    }
  }, [
    controls,
    autoRotate,
    autoRotateSpeed,
    panSpeed,
    rotateSpeed,
    zoomSpeed,
    enableDamping,
    dampingFactor,
    target,
  ])

  useEffect(() => {
    if (!controls || !onStart) return
    controls.addEventListener("start", onStart)
    return () => {
      controls.removeEventListener("start", onStart)
    }
  }, [controls, onStart])

  useEffect(() => {
    if (!controls) return
    return () => {
      controls.dispose()
    }
  }, [controls])

  useFrame(() => {
    if (!controls) return
    applyInfiniteDolly({ camera, controls, minimumDollyDistance })
    controls.update()
  }, [camera, controls, minimumDollyDistance])

  return null
}
