import { useCallback, useEffect, useRef, useMemo } from "react"
import { useRegisteredHotkey } from "./useRegisteredHotkey"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import {
  getComponentTypeLabel,
  type ComponentType,
} from "../utils/component-type"

interface UseVisibilityHotkeysProps {
  onVisibilityChange?: (message: string | null) => void
}

export const useVisibilityHotkeys = ({
  onVisibilityChange,
}: UseVisibilityHotkeysProps = {}) => {
  const { visibility, toggleLayer } = useLayerVisibility()
  const visibilityToastTimeoutRef = useRef<number | null>(null)

  const showVisibilityFeedback = useCallback(
    (componentType: ComponentType, isVisible: boolean) => {
      if (visibilityToastTimeoutRef.current) {
        window.clearTimeout(visibilityToastTimeoutRef.current)
      }
      const label = getComponentTypeLabel(componentType)
      const message = `${label} ${isVisible ? "visible" : "hidden"}`
      onVisibilityChange?.(message)
      visibilityToastTimeoutRef.current = window.setTimeout(() => {
        onVisibilityChange?.(null)
      }, 2000)
    },
    [onVisibilityChange],
  )

  useEffect(() => {
    return () => {
      if (visibilityToastTimeoutRef.current) {
        window.clearTimeout(visibilityToastTimeoutRef.current)
      }
    }
  }, [])

  const createToggleVisibility = useCallback(
    (layerKey: keyof typeof visibility, componentType: ComponentType) => {
      return () => {
        const nextVisible = !visibility[layerKey]
        toggleLayer(layerKey)
        showVisibilityFeedback(componentType, nextVisible)
      }
    },
    [toggleLayer, visibility, showVisibilityFeedback],
  )

  const toggleSmdVisibility = useMemo(
    () => createToggleVisibility("smtModels", "smd"),
    [createToggleVisibility],
  )

  const toggleThroughHoleVisibility = useMemo(
    () => createToggleVisibility("throughHoleModels", "through_hole"),
    [createToggleVisibility],
  )

  const toggleVirtualVisibility = useMemo(
    () => createToggleVisibility("virtualModels", "virtual"),
    [createToggleVisibility],
  )

  // Register hotkeys
  useRegisteredHotkey("toggle_smd_components", toggleSmdVisibility, {
    key: "s",
    description: "Toggle SMD components",
  })

  useRegisteredHotkey(
    "toggle_through_hole_components",
    toggleThroughHoleVisibility,
    {
      key: "t",
      description: "Toggle through-hole components",
    },
  )

  useRegisteredHotkey("toggle_virtual_components", toggleVirtualVisibility, {
    key: "v",
    description: "Toggle virtual components",
  })
}
