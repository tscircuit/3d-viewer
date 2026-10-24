import { useEffect, useRef } from "react"
import { useAppearance } from "../contexts/appearance-context"
import { useFrame, useThree } from "../react-three/ThreeContext"
import { createEdgeOverlay } from "../utils/edge-overlay"

export const EdgeOverlay = () => {
  const { scene, rootObject } = useThree()
  const { edgeMode, edgeWidth, darkBackgroundEnabled } = useAppearance()
  const overlayRef = useRef<ReturnType<typeof createEdgeOverlay> | null>(null)

  useEffect(() => {
    const overlay = createEdgeOverlay(rootObject, scene)
    overlayRef.current = overlay
    return () => {
      overlay.dispose()
      overlayRef.current = null
    }
  }, [rootObject, scene])

  useFrame(() => {
    overlayRef.current?.update(edgeMode, edgeWidth, darkBackgroundEnabled)
  }, [edgeMode, edgeWidth, darkBackgroundEnabled])

  useEffect(() => {
    overlayRef.current?.update(edgeMode, edgeWidth, darkBackgroundEnabled)
  }, [edgeMode, edgeWidth, darkBackgroundEnabled])

  return null
}
