import React, { useEffect, useMemo } from "react"
import * as THREE from "three"
import { useThree } from "./ThreeContext"

export const Lights: React.FC = () => {
  const { scene } = useThree()

  const ambientLight = useMemo(
    () => new THREE.AmbientLight(0xffffff, Math.PI * 0.75),
    [],
  )
  const pointLight = useMemo(() => {
    const light = new THREE.PointLight(0xffffff, Math.PI / 4)
    light.position.set(-10, -10, 10)
    light.decay = 0
    return light
  }, [])
  const directionalLight = useMemo(() => {
    const light = new THREE.DirectionalLight(0xffffff, Math.PI * 0.5)
    light.position.set(5, 10, 7)
    return light
  }, [])

  useEffect(() => {
    if (!scene) return
    scene.add(ambientLight)
    scene.add(pointLight)
    scene.add(directionalLight)
    return () => {
      scene.remove(ambientLight)
      scene.remove(pointLight)
      scene.remove(directionalLight)
    }
  }, [scene, ambientLight, pointLight, directionalLight])

  return null
}
