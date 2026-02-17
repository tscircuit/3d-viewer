import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { createPcbTexture } from "../utils/pcb-texture"

/**
 * React hook that generates a PCB texture from circuit JSON using
 * circuit-to-svg and resvg-wasm. Returns a Three.js texture or null
 * while loading. Handles cleanup on unmount.
 */
export function usePcbTexture(
  circuitJson: AnyCircuitElement[],
): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const abortRef = useRef(false)

  useEffect(() => {
    abortRef.current = false
    let currentTexture: THREE.Texture | null = null

    createPcbTexture(circuitJson)
      .then((tex) => {
        if (abortRef.current) {
          tex.dispose()
          return
        }
        currentTexture = tex
        setTexture(tex)
      })
      .catch((error) => {
        console.warn("Failed to generate PCB texture:", error)
      })

    return () => {
      abortRef.current = true
      if (currentTexture) {
        currentTexture.dispose()
      }
      setTexture(null)
    }
  }, [circuitJson])

  return texture
}
