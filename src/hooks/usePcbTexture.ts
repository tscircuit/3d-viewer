import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { createPcbTexture } from "../utils/pcb-texture"

/**
 * Simple, fast hash of a JSON-serialisable value.
 * Used to detect when circuitJson actually changes, avoiding unnecessary
 * re-renders caused by unstable object references.
 */
function hashCircuitJson(circuitJson: AnyCircuitElement[]): string {
  // JSON.stringify is surprisingly fast for moderate-sized arrays and gives
  // us a deterministic string we can compare cheaply via reference equality.
  // For very large circuit JSON this could be optimised further, but it is
  // already orders of magnitude cheaper than regenerating the texture.
  const raw = JSON.stringify(circuitJson)

  // DJB2-style hash → 32-bit integer → hex string
  let hash = 5381
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16)
}

/**
 * React hook that generates a PCB texture from circuit JSON using
 * circuit-to-svg and resvg-wasm. Returns a Three.js texture or null
 * while loading. Handles cleanup on unmount.
 *
 * The hook uses a hash of the circuit JSON to avoid regenerating the
 * texture when the object reference changes but the data is identical.
 */
export function usePcbTexture(
  circuitJson: AnyCircuitElement[],
): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const abortRef = useRef(false)

  // Memoize a hash of the circuitJson so that we only regenerate the
  // texture when the actual data changes, not just the reference.
  const jsonHash = useMemo(() => hashCircuitJson(circuitJson), [circuitJson])

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
  }, [jsonHash])

  return texture
}
