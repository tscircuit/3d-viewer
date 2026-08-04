import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

interface RenderingModeContextType {
  darkBackgroundEnabled: boolean
  setDarkBackgroundEnabled: (enabled: boolean) => void
  lightingEnabled: boolean
  setLightingEnabled: (enabled: boolean) => void
  shadowsEnabled: boolean
}

const DARK_BACKGROUND_STORAGE_KEY = "cadViewerDarkBackgroundEnabled"
const LIGHTING_STORAGE_KEY = "cadViewerLightingEnabled"

const readStoredDarkBackgroundEnabled = (): boolean => {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(DARK_BACKGROUND_STORAGE_KEY) !== "false"
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
}> = ({ children }) => {
  const [darkBackgroundEnabled, setDarkBackgroundEnabled] = useState<boolean>(
    readStoredDarkBackgroundEnabled,
  )
  const [lightingEnabled, setLightingEnabled] = useState<boolean>(
    readStoredLightingEnabled,
  )

  useEffect(() => {
    window.localStorage.setItem(
      DARK_BACKGROUND_STORAGE_KEY,
      darkBackgroundEnabled ? "true" : "false",
    )
  }, [darkBackgroundEnabled])

  useEffect(() => {
    window.localStorage.setItem(
      LIGHTING_STORAGE_KEY,
      lightingEnabled ? "true" : "false",
    )
  }, [lightingEnabled])

  const value = useMemo(
    () => ({
      darkBackgroundEnabled,
      setDarkBackgroundEnabled,
      lightingEnabled,
      setLightingEnabled,
      shadowsEnabled: lightingEnabled,
    }),
    [darkBackgroundEnabled, lightingEnabled],
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
