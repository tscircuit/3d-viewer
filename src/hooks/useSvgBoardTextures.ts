import { useEffect, useState, useCallback, useRef } from "react"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import type { LayerVisibilityState } from "../contexts/LayerVisibilityContext"
import {
  createSvgBasedTexture,
  type SvgTextureOptions,
  initResvgWasm,
  isResvgInitialized,
} from "../textures"

export interface SvgTexturesResult {
  topTexture: THREE.DataTexture | null
  bottomTexture: THREE.DataTexture | null
  isLoading: boolean
  error: string | null
}

/**
 * Hook for generating high-quality SVG-based PCB textures.
 *
 * This hook uses resvg-wasm to render SVG representations of the PCB
 * to high-resolution raster textures. This provides better quality
 * than canvas-based rendering, especially for text and fine details.
 *
 * @example
 * ```tsx
 * const { topTexture, bottomTexture, isLoading, error } = useSvgBoardTextures({
 *   circuitJson,
 *   boardData,
 *   visibility,
 * });
 * ```
 */
export function useSvgBoardTextures({
  circuitJson,
  boardData,
  visibility,
}: {
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard | null
  visibility: Partial<LayerVisibilityState>
}): SvgTexturesResult {
  const [topTexture, setTopTexture] = useState<THREE.DataTexture | null>(null)
  const [bottomTexture, setBottomTexture] = useState<THREE.DataTexture | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true)
  // Track previous textures for cleanup
  const prevTexturesRef = useRef<{
    top: THREE.DataTexture | null
    bottom: THREE.DataTexture | null
  }>({ top: null, bottom: null })

  // Cleanup function for textures
  const cleanupTexture = useCallback((texture: THREE.DataTexture | null) => {
    if (texture) {
      texture.dispose()
    }
  }, [])

  useEffect(() => {
    // Reset mounted flag
    isMountedRef.current = true

    // Check if SVG textures are enabled
    const svgTexturesEnabled = visibility.svgTexturesEnabled ?? false
    const svgTextureTop = visibility.svgTextureTop ?? true
    const svgTextureBottom = visibility.svgTextureBottom ?? true
    const resolution = visibility.svgTextureResolution ?? 150

    if (!svgTexturesEnabled || !boardData) {
      // Clean up any existing textures
      cleanupTexture(prevTexturesRef.current.top)
      cleanupTexture(prevTexturesRef.current.bottom)
      prevTexturesRef.current = { top: null, bottom: null }
      setTopTexture(null)
      setBottomTexture(null)
      setIsLoading(false)
      setError(null)
      return
    }

    // Start loading
    setIsLoading(true)
    setError(null)

    const generateTextures = async () => {
      try {
        // Ensure resvg-wasm is initialized
        if (!isResvgInitialized()) {
          await initResvgWasm()
        }

        const numLayers = boardData.num_layers ?? 2

        // Generate top texture
        let newTopTexture: THREE.DataTexture | null = null
        if (svgTextureTop) {
          const topOptions: SvgTextureOptions = {
            width: 0, // Will be calculated based on board size
            height: 0,
            layer: "top",
            resolution,
            colors: {
              copper: "rgb(200, 150, 50)",
              silkscreen: "rgb(255, 255, 255)",
              soldermask: "rgb(4, 15, 7)",
              substrate: "rgb(153, 110, 71)",
            },
          }

          newTopTexture = await createSvgBasedTexture(
            circuitJson,
            boardData,
            topOptions,
          )
        }

        // Generate bottom texture
        let newBottomTexture: THREE.DataTexture | null = null
        if (svgTextureBottom && numLayers >= 2) {
          const bottomOptions: SvgTextureOptions = {
            width: 0,
            height: 0,
            layer: "bottom",
            resolution,
            colors: {
              copper: "rgb(200, 150, 50)",
              silkscreen: "rgb(255, 255, 255)",
              soldermask: "rgb(4, 15, 7)",
              substrate: "rgb(153, 110, 71)",
            },
          }

          newBottomTexture = await createSvgBasedTexture(
            circuitJson,
            boardData,
            bottomOptions,
          )
        }

        // Only update state if still mounted
        if (isMountedRef.current) {
          // Clean up old textures
          cleanupTexture(prevTexturesRef.current.top)
          cleanupTexture(prevTexturesRef.current.bottom)

          // Store new textures
          prevTexturesRef.current = {
            top: newTopTexture,
            bottom: newBottomTexture,
          }

          setTopTexture(newTopTexture)
          setBottomTexture(newBottomTexture)
          setIsLoading(false)
        } else {
          // Component unmounted, clean up new textures
          cleanupTexture(newTopTexture)
          cleanupTexture(newBottomTexture)
        }
      } catch (err) {
        console.error("Error generating SVG textures:", err)
        if (isMountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to generate textures",
          )
          setIsLoading(false)
        }
      }
    }

    generateTextures()

    // Cleanup
    return () => {
      isMountedRef.current = false
    }
  }, [
    circuitJson,
    boardData,
    visibility.svgTexturesEnabled,
    visibility.svgTextureTop,
    visibility.svgTextureBottom,
    visibility.svgTextureResolution,
    cleanupTexture,
  ])

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTexture(prevTexturesRef.current.top)
      cleanupTexture(prevTexturesRef.current.bottom)
      prevTexturesRef.current = { top: null, bottom: null }
    }
  }, [cleanupTexture])

  return {
    topTexture,
    bottomTexture,
    isLoading,
    error,
  }
}

/**
 * Preload the resvg-wasm module.
 * Call this early in your application to ensure the WASM is ready when needed.
 */
export function usePreloadResvgWasm() {
  useEffect(() => {
    if (!isResvgInitialized()) {
      initResvgWasm().catch((error) => {
        console.warn("Failed to preload resvg-wasm:", error)
      })
    }
  }, [])
}
