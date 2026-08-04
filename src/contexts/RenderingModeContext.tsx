import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

interface RenderingModeContextType {
  lightingEnabled: boolean
  setLightingEnabled: (enabled: boolean) => void
  shadowsEnabled: boolean
}

const LIGHTING_STORAGE_KEY = "cadViewerLightingEnabled"

const readStoredLightingEnabled = (): boolean => {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(LIGHTING_STORAGE_KEY) !== "false"
}

const RenderingModeContext = createContext<
  RenderingModeContextType | undefined
>(undefined)

export const RenderingModeProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [lightingEnabled, setLightingEnabled] = useState<boolean>(
    readStoredLightingEnabled,
  )

  useEffect(() => {
    window.localStorage.setItem(
      LIGHTING_STORAGE_KEY,
      lightingEnabled ? "true" : "false",
    )
  }, [lightingEnabled])

  const value = useMemo(
    () => ({
      lightingEnabled,
      setLightingEnabled,
      shadowsEnabled: lightingEnabled,
    }),
    [lightingEnabled],
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
