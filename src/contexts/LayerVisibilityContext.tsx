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
  toggleLayer: (layer: keyof LayerVisibilityState) => void
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

const STORAGE_KEY = "cadViewer_layerVisibility"

const LayerVisibilityContext = createContext<
  LayerVisibilityContextType | undefined
>(undefined)

export const LayerVisibilityProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [visibility, setVisibility] =
    useState<LayerVisibilityState>(defaultVisibility)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setVisibility({ ...defaultVisibility, ...parsed })
      }
    } catch (e) {
      console.error("Failed to load layer visibility from localStorage:", e)
    }
  }, [])

  // Save to localStorage whenever visibility changes
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility))
    } catch (e) {
      console.error("Failed to save layer visibility to localStorage:", e)
    }
  }, [visibility])

  const toggleLayer = useCallback((layer: keyof LayerVisibilityState) => {
    setVisibility((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }))
  }, [])

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
