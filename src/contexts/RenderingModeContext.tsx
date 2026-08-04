import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type BackgroundMode = "dark" | "light" | "transparent"

interface RenderingModeContextType {
  backgroundMode: BackgroundMode
  setBackgroundMode: (mode: BackgroundMode) => void
  lightingEnabled: boolean
  setLightingEnabled: (enabled: boolean) => void
  shadowsEnabled: boolean
}

const BACKGROUND_STORAGE_KEY = "cadViewerBackgroundMode"
const LIGHTING_STORAGE_KEY = "cadViewerLightingEnabled"

const readStoredBackgroundMode = (): BackgroundMode => {
  if (typeof window === "undefined") return "dark"
  const stored = window.localStorage.getItem(BACKGROUND_STORAGE_KEY)
  return stored === "light" || stored === "transparent" ? stored : "dark"
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
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(
    readStoredBackgroundMode,
  )
  const [lightingEnabled, setLightingEnabled] = useState<boolean>(
    readStoredLightingEnabled,
  )

  useEffect(() => {
    window.localStorage.setItem(BACKGROUND_STORAGE_KEY, backgroundMode)
  }, [backgroundMode])

  useEffect(() => {
    window.localStorage.setItem(
      LIGHTING_STORAGE_KEY,
      lightingEnabled ? "true" : "false",
    )
  }, [lightingEnabled])

  const value = useMemo(
    () => ({
      backgroundMode,
      setBackgroundMode,
      lightingEnabled,
      setLightingEnabled,
      shadowsEnabled: lightingEnabled,
    }),
    [backgroundMode, lightingEnabled],
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
