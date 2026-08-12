import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react"

export interface LayerVisibilityState {
  boardBody: boolean
  topCopper: boolean
  bottomCopper: boolean
  keepout: boolean
  adhesive: boolean
  solderPaste: boolean
  topSilkscreen: boolean
  bottomSilkscreen: boolean
  topMask: boolean
  bottomMask: boolean
  throughHoleModels: boolean
  smtModels: boolean
  translucentModels: boolean
  modelsNotInPosFile: boolean
  modelsMarkedDNP: boolean
  modelBoundingBoxes: boolean
  threedAxis: boolean
  pcbNotes: boolean
  backgroundStart: boolean
  backgroundEnd: boolean
  /**
   * Three-state display for the single assembled enclosure CAD entity. This is
   * viewer state, not Circuit JSON: hidden to work unobstructed, translucent to
   * check openings against the board, opaque to inspect the print itself.
   */
  enclosure: EnclosureVisibility
}

export type EnclosureVisibility = "hidden" | "translucent" | "opaque"

export const ENCLOSURE_VISIBILITY_CYCLE: EnclosureVisibility[] = [
  "translucent",
  "opaque",
  "hidden",
]

export const nextEnclosureVisibility = (
  current: EnclosureVisibility,
): EnclosureVisibility =>
  ENCLOSURE_VISIBILITY_CYCLE[
    (ENCLOSURE_VISIBILITY_CYCLE.indexOf(current) + 1) %
      ENCLOSURE_VISIBILITY_CYCLE.length
  ]!

interface LayerVisibilityContextType {
  visibility: LayerVisibilityState
  setLayerVisibility: <K extends keyof LayerVisibilityState>(
    layer: K,
    visible: LayerVisibilityState[K],
  ) => void
  resetToDefaults: () => void
}

const defaultVisibility: LayerVisibilityState = {
  boardBody: true,
  topCopper: true,
  bottomCopper: true,
  keepout: true,
  adhesive: false,
  solderPaste: false,
  topSilkscreen: true,
  bottomSilkscreen: true,
  topMask: true,
  bottomMask: true,
  throughHoleModels: true,
  smtModels: true,
  translucentModels: true,
  modelsNotInPosFile: false,
  modelsMarkedDNP: false,
  modelBoundingBoxes: false,
  threedAxis: false,
  pcbNotes: false,
  backgroundStart: true,
  backgroundEnd: true,
  enclosure: "translucent",
}

const LayerVisibilityContext = createContext<
  LayerVisibilityContextType | undefined
>(undefined)

export const LayerVisibilityProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [visibility, setVisibility] =
    useState<LayerVisibilityState>(defaultVisibility)

  const setLayerVisibility = useCallback(
    <K extends keyof LayerVisibilityState>(
      layer: K,
      visible: LayerVisibilityState[K],
    ) => {
      setVisibility((prev) => ({
        ...prev,
        [layer]: visible,
      }))
    },
    [],
  )

  const resetToDefaults = useCallback(() => {
    setVisibility(defaultVisibility)
  }, [])

  const value = useMemo(
    () => ({
      visibility,
      setLayerVisibility,
      resetToDefaults,
    }),
    [visibility, setLayerVisibility, resetToDefaults],
  )

  return (
    <LayerVisibilityContext.Provider value={value}>
      {children}
    </LayerVisibilityContext.Provider>
  )
}

export const useLayerVisibility = () => {
  const context = useContext(LayerVisibilityContext)
  if (!context) {
    throw new Error(
      "useLayerVisibility must be used within a LayerVisibilityProvider",
    )
  }
  return context
}
