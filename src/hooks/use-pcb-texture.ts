import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import type { AnyCircuitElement } from "circuit-json"
import {
  generatePcbTexture,
  cleanupTextureUrl,
} from "../utils/pcb-texture-generator"

export function usePcbTexture(
  circuitJson: AnyCircuitElement[] | undefined,
  enabled = true,
): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const textureUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !circuitJson || circuitJson.length === 0) {
      setTexture(null)
      return
    }

    let cancelled = false
    setIsLoading(true)

    generatePcbTexture(circuitJson, 1024, 1024)
      .then((textureUrl) => {
        if (cancelled) {
          cleanupTextureUrl(textureUrl)
          return
        }

        // Load texture with THREE.js
        const loader = new THREE.TextureLoader()
        loader.load(
          textureUrl,
          (loadedTexture) => {
            if (!cancelled) {
              textureUrlRef.current = textureUrl
              setTexture(loadedTexture)
              setIsLoading(false)
            } else {
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

    // Cleanup function
    return () => {
      cancelled = true
      if (textureUrlRef.current) {
        cleanupTextureUrl(textureUrlRef.current)
        textureUrlRef.current = null
      }
      if (texture) {
        texture.dispose()
        setTexture(null)
      }
    }
  }, [circuitJson, enabled])

  return texture
}
