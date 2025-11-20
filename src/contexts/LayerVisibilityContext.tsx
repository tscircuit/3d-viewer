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
  adhesive: boolean
  solderPaste: boolean
  topSilkscreen: boolean
  bottomSilkscreen: boolean
  topMask: boolean
  bottomMask: boolean
  throughHoleModels: boolean
  smtModels: boolean
  virtualModels: boolean
  modelsNotInPosFile: boolean
  modelsMarkedDNP: boolean
  modelBoundingBoxes: boolean
  threedAxis: boolean
  backgroundStart: boolean
  backgroundEnd: boolean
}

interface LayerVisibilityContextType {
  visibility: LayerVisibilityState
  toggleLayer: (layer: keyof LayerVisibilityState) => boolean
  setLayerVisibility: (
    layer: keyof LayerVisibilityState,
    visible: boolean,
  ) => void
  resetToDefaults: () => void
}

const defaultVisibility: LayerVisibilityState = {
  boardBody: true,
  topCopper: true,
  bottomCopper: true,
  adhesive: false,
  solderPaste: false,
  topSilkscreen: true,
  bottomSilkscreen: true,
  topMask: true,
  bottomMask: true,
  throughHoleModels: true,
  smtModels: true,
  virtualModels: false,
  modelsNotInPosFile: false,
  modelsMarkedDNP: false,
  modelBoundingBoxes: false,
  threedAxis: false,
  backgroundStart: true,
  backgroundEnd: true,
}

const LayerVisibilityContext = createContext<
  LayerVisibilityContextType | undefined
>(undefined)

export const LayerVisibilityProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [visibility, setVisibility] =
    useState<LayerVisibilityState>(defaultVisibility)

  const toggleLayer = useCallback(
    (layer: keyof LayerVisibilityState) => {
      const newState = !visibility[layer]
      setVisibility((prev) => ({
        ...prev,
        [layer]: newState,
      }))
      return newState
    },
    [visibility],
  )

  const setLayerVisibility = useCallback(
    (layer: keyof LayerVisibilityState, visible: boolean) => {
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
      toggleLayer,
      setLayerVisibility,
      resetToDefaults,
    }),
    [visibility, toggleLayer, setLayerVisibility, resetToDefaults],
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
