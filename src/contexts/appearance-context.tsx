import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

interface AppearanceContextType {
  darkBackgroundEnabled: boolean
  setDarkBackgroundEnabled: (enabled: boolean) => void
  lightingEnabled: boolean
  setLightingEnabled: (enabled: boolean) => void
}

const LIGHTING_STORAGE_KEY = "cadViewerLightingEnabled"

const readStoredLightingEnabled = (): boolean => {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(LIGHTING_STORAGE_KEY) !== "false"
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(
  undefined,
)

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Transparent is the default. The dark studio backdrop is an opt-in review
  // aid and intentionally does not persist between new viewer sessions.
  const [darkBackgroundEnabled, setDarkBackgroundEnabled] = useState(false)
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
      darkBackgroundEnabled,
      setDarkBackgroundEnabled,
      lightingEnabled,
      setLightingEnabled,
    }),
    [darkBackgroundEnabled, lightingEnabled],
  )

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}

export const useAppearance = () => {
  const context = useContext(AppearanceContext)
  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider")
  }
  return context
}
