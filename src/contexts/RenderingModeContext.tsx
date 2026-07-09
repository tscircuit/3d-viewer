import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type RenderingMode = "engineering" | "realistic"

interface RenderingModeContextType {
  renderingMode: RenderingMode
  setRenderingMode: (mode: RenderingMode) => void
  lightingEnabled: boolean
  setLightingEnabled: (enabled: boolean) => void
  shadowsEnabled: boolean
}

const STORAGE_KEY = "cadViewerRenderingMode"
const LIGHTING_STORAGE_KEY = "cadViewerLightingEnabled"

const readStoredRenderingMode = (): RenderingMode => {
  if (typeof window === "undefined") return "engineering"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === "realistic" || stored === "engineering"
    ? stored
    : "engineering"
}

const readStoredLightingEnabled = (): boolean => {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(LIGHTING_STORAGE_KEY) !== "false"
}

const RenderingModeContext = createContext<
  RenderingModeContextType | undefined
>(undefined)

export const RenderingModeProvider: React.FC<{
  children: React.ReactNode
  initialMode?: RenderingMode
}> = ({ children, initialMode }) => {
  const [renderingMode, setRenderingModeState] = useState<RenderingMode>(
    initialMode ?? readStoredRenderingMode,
  )
  const [lightingEnabled, setLightingEnabled] = useState<boolean>(
    readStoredLightingEnabled,
  )

  const setRenderingMode = useCallback((mode: RenderingMode) => {
    setRenderingModeState(mode)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, renderingMode)
  }, [renderingMode])

  useEffect(() => {
    window.localStorage.setItem(
      LIGHTING_STORAGE_KEY,
      lightingEnabled ? "true" : "false",
    )
  }, [lightingEnabled])

  const value = useMemo(
    () => ({
      renderingMode,
      setRenderingMode,
      lightingEnabled,
      setLightingEnabled,
      shadowsEnabled: lightingEnabled && renderingMode === "realistic",
    }),
    [lightingEnabled, renderingMode, setRenderingMode],
  )

  return (
    <RenderingModeContext.Provider value={value}>
      {children}
    </RenderingModeContext.Provider>
  )
}

export const useRenderingMode = () => {
  const context = useContext(RenderingModeContext)
  if (!context) {
    throw new Error(
      "useRenderingMode must be used within a RenderingModeProvider",
    )
  }
  return context
}
