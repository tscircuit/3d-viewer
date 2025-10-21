import React, { useEffect, useMemo } from "react"
import { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
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

  useEffect(() => {
    if (!onControlsChange) return
    onControlsChange(controls ?? null)
    return () => {
      onControlsChange(null)
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
    controls?.update()
  }, [controls])

  return null
}
