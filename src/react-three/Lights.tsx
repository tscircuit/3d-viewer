import React, { useEffect, useMemo } from "react"
import * as THREE from "three"
import { useThree } from "./ThreeContext"

type LightsProps = {
  boardDimensions?: { width?: number; height?: number }
  boardCenter?: { x: number; y: number }
  shadowsEnabled?: boolean
}

export const Lights: React.FC<LightsProps> = ({
  boardDimensions,
  boardCenter,
  shadowsEnabled = false,
}) => {
  const { scene } = useThree()

  const lightRig = useMemo(() => {
    const rig = new THREE.Group()
    rig.name = "cad-viewer-light-rig"

    const centerX = boardCenter?.x ?? 0
    const centerY = boardCenter?.y ?? 0
    const largestBoardDimension = Math.max(
      boardDimensions?.width ?? 0,
      boardDimensions?.height ?? 0,
      20,
    )
    const shadowHalfSize = largestBoardDimension * 0.8
    const lightDistance = largestBoardDimension

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
      castShadow = false,
    ) => {
      const light = new THREE.DirectionalLight(color, intensity)
      light.name = name
      light.position.set(
        centerX + position[0],
        centerY + position[1],
        position[2],
      )
      light.target.position.set(centerX, centerY, 0)
      light.castShadow = castShadow

      if (castShadow) {
        light.shadow.mapSize.set(2048, 2048)
        light.shadow.bias = -0.0002
        light.shadow.normalBias = 0.03
        light.shadow.radius = 5

        const shadowCamera = light.shadow.camera
        shadowCamera.left = -shadowHalfSize
        shadowCamera.right = shadowHalfSize
        shadowCamera.top = shadowHalfSize
        shadowCamera.bottom = -shadowHalfSize
        shadowCamera.near = 0.5
        shadowCamera.far = largestBoardDimension * 4
        shadowCamera.updateProjectionMatrix()
      }

      rig.add(light)
      rig.add(light.target)
    }

    addDirectionalLight(
      "cad-viewer-key-light",
      0xfff0df,
      2.4,
      [lightDistance * 0.22, -lightDistance * 0.28, lightDistance * 1.15],
      shadowsEnabled,
    )
    addDirectionalLight("cad-viewer-fill-light", 0xdde8ff, 0.7, [
      -lightDistance * 0.65,
      lightDistance * 0.45,
      lightDistance * 0.35,
    ])
    addDirectionalLight("cad-viewer-rim-light", 0xffffff, 1.1, [
      -lightDistance * 0.25,
      lightDistance * 0.75,
      lightDistance * 0.6,
    ])

    return rig
  }, [boardCenter, boardDimensions, shadowsEnabled])

  useEffect(() => {
    if (!scene) return
    scene.add(lightRig)
    return () => {
      scene.remove(lightRig)
    }
  }, [scene, lightRig])

  return null
}
