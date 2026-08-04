import type React from "react"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import type { BackgroundMode } from "../contexts/RenderingModeContext"
import { useThree } from "./ThreeContext"

type LightsProps = {
  backgroundMode?: BackgroundMode
  boardDimensions?: { width?: number; height?: number }
  boardCenter?: { x: number; y: number }
  shadowsEnabled?: boolean
}

export const Lights: React.FC<LightsProps> = ({
  backgroundMode = "dark",
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
    const keyLightDistance = largestBoardDimension * 1.7

    const ambientLight = new THREE.AmbientLight(0xf6fbf8, 0.22)
    ambientLight.name = "cad-viewer-soft-ambient"
    rig.add(ambientLight)

    const hemisphereLight = new THREE.HemisphereLight(0xe4f1ed, 0x18221d, 0.2)
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
        shadowCamera.far = Math.max(
          largestBoardDimension * 4,
          Math.hypot(...position) + largestBoardDimension * 2,
        )
        shadowCamera.updateProjectionMatrix()
      }

      rig.add(light)
      rig.add(light.target)
    }

    addDirectionalLight(
      "cad-viewer-key-light",
      0xfff8ee,
      1.35,
      [
        keyLightDistance * 0.68,
        -keyLightDistance * 0.8,
        keyLightDistance * 1.08,
      ],
      shadowsEnabled,
    )
    addDirectionalLight("cad-viewer-fill-light", 0xdce8f2, 0.25, [
      -lightDistance * 0.85,
      lightDistance * 0.55,
      lightDistance * 0.75,
    ])
    addDirectionalLight("cad-viewer-rim-light", 0xb9ead3, 0.5, [
      -lightDistance * 0.35,
      lightDistance * 0.85,
      lightDistance * 0.95,
    ])

    return rig
  }, [boardCenter, boardDimensions, shadowsEnabled])

  useEffect(() => {
    const previousBackground = scene.background
    const previousEnvironment = scene.environment
    scene.background =
      backgroundMode === "transparent"
        ? null
        : new THREE.Color(backgroundMode === "dark" ? 0x101310 : 0xe8ece9)
    // The generic RoomEnvironment is very bright and makes a green solder
    // mask look white. The controlled key/fill/rim rig provides the tighter,
    // product-render highlights used for the board itself.
    scene.environment = null

    return () => {
      scene.background = previousBackground
      scene.environment = previousEnvironment
    }
  }, [backgroundMode, scene])

  useEffect(() => {
    if (!scene) return
    scene.add(lightRig)
    return () => {
      scene.remove(lightRig)
    }
  }, [scene, lightRig])

  return null
}
