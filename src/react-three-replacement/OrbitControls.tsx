import React, { useEffect, useMemo } from "react"
import { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { useFrame, useThree } from "./ThreeContext"

interface OrbitControlsProps {
  autoRotate?: boolean
  autoRotateSpeed?: number
  onStart?: () => void
}

export const OrbitControls: React.FC<OrbitControlsProps> = ({
  autoRotate,
  autoRotateSpeed,
  onStart,
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
  }, [controls, autoRotate, autoRotateSpeed])

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
