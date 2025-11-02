import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import type { LayerType } from "../hooks/use-stls-from-geom"
import { STLModel } from "./STLModel"
import * as THREE from "three"

interface VisibleSTLModelProps {
  stlData: ArrayBuffer
  color: any
  opacity?: number
  layerType?: LayerType
  texture?: THREE.Texture
}

export function VisibleSTLModel({
  stlData,
  color,
  opacity = 1,
  layerType,
  texture,
}: VisibleSTLModelProps) {
  const { visibility } = useLayerVisibility()

  // Determine visibility based on layerType
  let shouldShow = true

  if (layerType === "board") {
    shouldShow = visibility.boardBody
  } else if (layerType === "top-copper") {
    shouldShow = visibility.topCopper
  } else if (layerType === "bottom-copper") {
    shouldShow = visibility.bottomCopper
  } else if (layerType === "top-silkscreen") {
    shouldShow = visibility.topSilkscreen
  } else if (layerType === "bottom-silkscreen") {
    shouldShow = visibility.bottomSilkscreen
  }
  // If layerType is undefined, show by default (backwards compatibility)

  if (!shouldShow) {
    return null
  }

  return (
    <STLModel
      stlData={stlData}
      color={color}
      opacity={opacity}
      texture={texture}
    />
  )
}
