import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  DEFAULT_BOARD_SURFACE_TEXTURE_ID,
  isBoardSurfaceTextureId,
  type BoardSurfaceTextureId,
} from "../board-surface-textures"

export type RenderingMode = "engineering" | "realistic"

interface RenderingModeContextType {
  renderingMode: RenderingMode
  setRenderingMode: (mode: RenderingMode) => void
  lightingEnabled: boolean
  setLightingEnabled: (enabled: boolean) => void
  shadowsEnabled: boolean
  boardSurfaceTexture: BoardSurfaceTextureId
  setBoardSurfaceTexture: (texture: BoardSurfaceTextureId) => void
}

const STORAGE_KEY = "cadViewerRenderingMode"
const LIGHTING_STORAGE_KEY = "cadViewerLightingEnabled"
const BOARD_SURFACE_TEXTURE_STORAGE_KEY = "cadViewerBoardSurfaceTexture"

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

const readStoredBoardSurfaceTexture = (): BoardSurfaceTextureId => {
  if (typeof window === "undefined") return DEFAULT_BOARD_SURFACE_TEXTURE_ID
  const stored = window.localStorage.getItem(BOARD_SURFACE_TEXTURE_STORAGE_KEY)
  return isBoardSurfaceTextureId(stored)
    ? stored
    : DEFAULT_BOARD_SURFACE_TEXTURE_ID
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
  const [boardSurfaceTexture, setBoardSurfaceTexture] =
    useState<BoardSurfaceTextureId>(readStoredBoardSurfaceTexture)

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

  useEffect(() => {
    window.localStorage.setItem(
      BOARD_SURFACE_TEXTURE_STORAGE_KEY,
      boardSurfaceTexture,
    )
  }, [boardSurfaceTexture])

  const value = useMemo(
    () => ({
      renderingMode,
      setRenderingMode,
      lightingEnabled,
      setLightingEnabled,
      shadowsEnabled: lightingEnabled && renderingMode === "realistic",
      boardSurfaceTexture,
      setBoardSurfaceTexture,
    }),
    [lightingEnabled, renderingMode, setRenderingMode, boardSurfaceTexture],
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
