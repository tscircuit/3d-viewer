import React, { useEffect, useMemo } from "react"
import * as THREE from "three"
import { useThree } from "./ThreeContext"

export const Lights: React.FC = () => {
  const { scene } = useThree()

  const lightRig = useMemo(() => {
    const rig = new THREE.Group()
    rig.name = "cad-viewer-light-rig"

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.18)
    ambientLight.name = "cad-viewer-soft-ambient"
    rig.add(ambientLight)

    const hemisphereLight = new THREE.HemisphereLight(0xdde8ff, 0x1f211d, 0.45)
    hemisphereLight.name = "cad-viewer-hemisphere"
    rig.add(hemisphereLight)

    const addDirectionalLight = (
      name: string,
      color: THREE.ColorRepresentation,
      intensity: number,
      position: [number, number, number],
    ) => {
      const light = new THREE.DirectionalLight(color, intensity)
      light.name = name
      light.position.set(...position)
      light.target.position.set(0, 0, 0)
      rig.add(light)
      rig.add(light.target)
    }

    addDirectionalLight("cad-viewer-key-light", 0xfff0df, 2.4, [8, -10, 12])
    addDirectionalLight("cad-viewer-fill-light", 0xdde8ff, 0.7, [-10, 8, 5])
    addDirectionalLight("cad-viewer-rim-light", 0xffffff, 1.1, [-4, 10, 8])

    return rig
  }, [])

  useEffect(() => {
    if (!scene) return
    scene.add(lightRig)
    return () => {
      scene.remove(lightRig)
    }
  }, [scene, lightRig])

  return null
}
