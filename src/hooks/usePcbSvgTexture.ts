import { useState, useEffect } from "react"
import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
import {
  createPcbTextureFromCircuitJson,
  initResvgWasm,
} from "../utils/svg-texture-utils"

interface UsePcbSvgTextureOptions {
  circuitJson: AnyCircuitElement[] | null
  enabled?: boolean
}

interface UsePcbSvgTextureResult {
  topTexture: THREE.CanvasTexture | null
  bottomTexture: THREE.CanvasTexture | null
  isLoading: boolean
  error: Error | null
}

export function usePcbSvgTexture(
  options: UsePcbSvgTextureOptions,
): UsePcbSvgTextureResult {
  const { circuitJson, enabled = true } = options
  const [topTexture, setTopTexture] = useState<THREE.CanvasTexture | null>(null)
  const [bottomTexture, setBottomTexture] =
    useState<THREE.CanvasTexture | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!circuitJson || !enabled) return

    let cancelled = false

    async function generate() {
      setIsLoading(true)
      try {
        await initResvgWasm()
        if (cancelled) return

        const top = await createPcbTextureFromCircuitJson(circuitJson!, {
          layer: "top",
        })
        const bottom = await createPcbTextureFromCircuitJson(circuitJson!, {
          layer: "bottom",
        })

        if (!cancelled) {
          setTopTexture(top)
          setBottomTexture(bottom)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    generate()
    return () => {
      cancelled = true
    }
  }, [circuitJson, enabled])

  useEffect(() => {
    return () => {
      topTexture?.dispose()
      bottomTexture?.dispose()
    }
  }, [topTexture, bottomTexture])

  return { topTexture, bottomTexture, isLoading, error }
}
