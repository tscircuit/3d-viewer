import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

interface LightingContextType {
  lightingEnabled: boolean
  setLightingEnabled: (enabled: boolean) => void
  shadowsEnabled: boolean
}

const LIGHTING_STORAGE_KEY = "cadViewerLightingEnabled"

const readStoredLightingEnabled = (): boolean => {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(LIGHTING_STORAGE_KEY) !== "false"
}

const LightingContext = createContext<LightingContextType | undefined>(
  undefined,
)

export const LightingProvider: React.FC<{
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
    <LightingContext.Provider value={value}>
      {children}
    </LightingContext.Provider>
  )
}

export const useLighting = () => {
  const context = useContext(LightingContext)
  if (!context) {
    throw new Error("useLighting must be used within a LightingProvider")
  }
  return context
}
