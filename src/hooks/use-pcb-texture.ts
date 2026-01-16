import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import type { AnyCircuitElement } from "circuit-json"
import {
  generatePcbTexture,
  cleanupTextureUrl,
} from "../utils/pcb-texture-generator"

/**
 * Manages the generation and lifecycle of a Three.js texture for a PCB.
 * Solves #534 by using a WASM-backed generator and ensuring strict GPU memory cleanup.
 */
export function usePcbTexture(
  circuitJson: AnyCircuitElement[] | undefined,
  enabled = true,
): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  /** * We use refs to track the URL and Texture object because the useEffect cleanup
   * function is a closure. Using refs ensures the cleanup always has access to the
   * "live" objects even after the component state becomes stale.
   */
  const textureUrlRef = useRef<string | null>(null)
  const textureRef = useRef<THREE.Texture | null>(null)

  useEffect(() => {
    // Immediate return if inactive to avoid unnecessary WASM initialization.
    if (!enabled || !circuitJson || circuitJson.length === 0) {
      if (textureRef.current) {
        textureRef.current.dispose()
        textureRef.current = null
      }
      setTexture(null)
      return
    }

    // Flag used to prevent setting state on unmounted components or stale requests.
    let cancelled = false
    setIsLoading(true)

    generatePcbTexture(circuitJson, 1024, 1024)
      .then((textureUrl) => {
        if (cancelled) {
          cleanupTextureUrl(textureUrl)
          return
        }

        const loader = new THREE.TextureLoader()
        loader.load(
          textureUrl,
          (loadedTexture) => {
            if (!cancelled) {
              /**
               * Proactively dispose of the previous texture before assigning the new one.
               * This is critical to prevent VRAM accumulation in long Storybook sessions.
               */
              if (textureRef.current) {
                textureRef.current.dispose()
              }

              textureUrlRef.current = textureUrl
              textureRef.current = loadedTexture
              setTexture(loadedTexture)
              setIsLoading(false)
            } else {
              // Cleanup if a newer request superseded this one during the loading phase.
              loadedTexture.dispose()
              cleanupTextureUrl(textureUrl)
            }
          },
          undefined,
          (error) => {
            console.warn("Failed to load PCB texture:", error)
            cleanupTextureUrl(textureUrl)
            if (!cancelled) {
              setTexture(null)
              setIsLoading(false)
            }
          },
        )
      })
      .catch((error) => {
        console.warn("Failed to generate PCB texture:", error)
        if (!cancelled) {
          setTexture(null)
          setIsLoading(false)
        }
      })

    /**
     * Cleanup Protocol:
     * 1. Invalidate current async request.
     * 2. Revoke the Blob URL to free system memory.
     * 3. Dispose of the Texture to free GPU VRAM.
     */
    return () => {
      cancelled = true
      if (textureUrlRef.current) {
        cleanupTextureUrl(textureUrlRef.current)
        textureUrlRef.current = null
      }
      if (textureRef.current) {
        textureRef.current.dispose()
        textureRef.current = null
      }
    }
  }, [circuitJson, enabled])

  return texture
}
