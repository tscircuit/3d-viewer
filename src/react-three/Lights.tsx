import { useEffect, useMemo, type FC } from "react"
import * as THREE from "three"
import { useThree } from "./ThreeContext"

export const Lights: FC = () => {
  const { scene } = useThree()

  const ambientLight = useMemo(() => new THREE.AmbientLight(0xffffff, 1), [])
  const hemisphereLight = useMemo(() => {
    const light = new THREE.HemisphereLight(0xf0f6ff, 0x1f1a14, 1.35)
    light.position.set(0, 0, 1)
    return light
  }, [])
  const keyLight = useMemo(() => {
    const light = new THREE.DirectionalLight(0xffffff, 2.25)
    light.position.set(6, 5, 9)
    return light
  }, [])
  const fillLight = useMemo(() => {
    const light = new THREE.DirectionalLight(0xf2f2ff, 1.75)
    light.position.set(-6, -4, 6)
    return light
  }, [])

  useEffect(() => {
    if (!scene) return
    scene.add(ambientLight)
    scene.add(hemisphereLight)
    scene.add(keyLight)
    scene.add(fillLight)
    return () => {
      scene.remove(ambientLight)
      scene.remove(hemisphereLight)
      scene.remove(keyLight)
      scene.remove(fillLight)
    }
  }, [scene, ambientLight, hemisphereLight, keyLight, fillLight])

  return null
}
