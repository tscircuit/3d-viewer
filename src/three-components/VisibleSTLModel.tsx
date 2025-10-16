import { useLayerVisibility } from "src/contexts/LayerVisibilityContext"
import { STLModel } from "./STLModel"

interface VisibleSTLModelProps {
  stlData: ArrayBuffer
  color: any
  opacity?: number
  index: number
  totalModels: number
}

export function VisibleSTLModel({
  stlData,
  color,
  opacity = 1,
  index,
  totalModels,
}: VisibleSTLModelProps) {
  const { visibility } = useLayerVisibility()

  // Determine what layer this STL represents based on its index
  // Index 0 is the board body
  // Other indices are copper/silkscreen layers
  const isBoardBody = index === 0
  const isCopper = index > 0 && index <= totalModels - 2 // Copper layers
  const isSilkscreen = index > totalModels - 2 // Last items are silkscreen

  // Check visibility
  let shouldShow = true
  if (isBoardBody) {
    shouldShow = visibility.boardBody
  } else if (isCopper) {
    // Show if either top or bottom copper is visible
    shouldShow = visibility.topCopper || visibility.bottomCopper
  } else if (isSilkscreen) {
    // Show if either top or bottom silkscreen is visible
    shouldShow = visibility.topSilkscreen || visibility.bottomSilkscreen
  }

  if (!shouldShow) {
    return null
  }

  return <STLModel stlData={stlData} color={color} opacity={opacity} />
}
