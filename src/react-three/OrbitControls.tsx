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
}) => {
  const { camera, renderer } = useThree()

  const controls = useMemo(() => {
    if (!camera || !renderer) return null
    return new ThreeOrbitControls(camera, renderer.domElement)
  }, [camera, renderer])

  useEffect(() => {
    if (!controls) return

    controls.autoRotate = autoRotate || false
    controls.autoRotateSpeed = autoRotateSpeed || 1.0
    if (panSpeed !== undefined) controls.panSpeed = panSpeed
    if (rotateSpeed !== undefined) controls.rotateSpeed = rotateSpeed
    if (zoomSpeed !== undefined) controls.zoomSpeed = zoomSpeed
    if (enableDamping !== undefined) controls.enableDamping = enableDamping
    if (dampingFactor !== undefined) controls.dampingFactor = dampingFactor
  }, [
    controls,
    autoRotate,
    autoRotateSpeed,
    panSpeed,
    rotateSpeed,
    zoomSpeed,
    enableDamping,
    dampingFactor,
  ])

  useEffect(() => {
    if (!controls || !onStart) return

    const handleStart = (event: any) => {
      // Don't trigger onStart for right-clicks (button 2)
      if (event.button !== 2) {
        onStart()
      }
    }

    controls.addEventListener("start", handleStart)
    return () => {
      controls.removeEventListener("start", handleStart)
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
