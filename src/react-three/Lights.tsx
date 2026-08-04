import type React from "react"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import type { RenderingMode } from "../contexts/RenderingModeContext"
import { useThree } from "./ThreeContext"

type LightsProps = {
  boardDimensions?: { width?: number; height?: number }
  boardCenter?: { x: number; y: number }
  shadowsEnabled?: boolean
  renderingMode?: RenderingMode
}

export const Lights: React.FC<LightsProps> = ({
  boardDimensions,
  boardCenter,
  shadowsEnabled = false,
  renderingMode = "engineering",
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
    const isRealistic = renderingMode === "realistic"
    const keyLightDistance = largestBoardDimension * (isRealistic ? 1.7 : 8.3)

    const ambientLight = new THREE.AmbientLight(
      isRealistic ? 0xf6fbf8 : 0xffffff,
      isRealistic ? 0.22 : 0.18,
    )
    ambientLight.name = "cad-viewer-soft-ambient"
    rig.add(ambientLight)

    const hemisphereLight = new THREE.HemisphereLight(
      isRealistic ? 0xe4f1ed : 0xdde8ff,
      isRealistic ? 0x18221d : 0x1f211d,
      isRealistic ? 0.2 : 0.45,
    )
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

    if (isRealistic) {
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
    } else {
      addDirectionalLight(
        "cad-viewer-key-light",
        0xffffff,
        2.4,
        [
          keyLightDistance * 0.22,
          -keyLightDistance * 0.28,
          keyLightDistance * 1.15,
        ],
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
    }

    return rig
  }, [boardCenter, boardDimensions, renderingMode, shadowsEnabled])

  useEffect(() => {
    if (renderingMode !== "realistic") return

    const previousBackground = scene.background
    const previousEnvironment = scene.environment
    scene.background = new THREE.Color(0x101310)
    // The generic RoomEnvironment is very bright and makes a green solder
    // mask look white. The controlled key/fill/rim rig provides the tighter,
    // product-render highlights used for the board itself.
    scene.environment = null

    return () => {
      scene.background = previousBackground
      scene.environment = previousEnvironment
    }
  }, [renderingMode, scene])

  useEffect(() => {
    if (!scene) return
    scene.add(lightRig)
    return () => {
      scene.remove(lightRig)
    }
  }, [scene, lightRig])

  return null
}
