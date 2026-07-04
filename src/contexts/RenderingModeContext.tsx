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
  shadowsEnabled: boolean
}

const STORAGE_KEY = "cadViewerRenderingMode"

const readStoredRenderingMode = (): RenderingMode => {
  if (typeof window === "undefined") return "engineering"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === "realistic" || stored === "engineering"
    ? stored
    : "engineering"
}

const RenderingModeContext = createContext<
  RenderingModeContextType | undefined
>(undefined)

export const RenderingModeProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [renderingMode, setRenderingModeState] = useState<RenderingMode>(
    readStoredRenderingMode,
  )

  const setRenderingMode = useCallback((mode: RenderingMode) => {
    setRenderingModeState(mode)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, renderingMode)
  }, [renderingMode])

  const value = useMemo(
    () => ({
      renderingMode,
      setRenderingMode,
      shadowsEnabled: renderingMode === "realistic",
    }),
    [renderingMode, setRenderingMode],
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
