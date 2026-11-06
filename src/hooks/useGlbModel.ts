import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import type * as THREE from "three"
import { disposeGlbScene, loadGlbScene } from "../utils/prerendered-glb"

type GlbRequest = { source: string | ArrayBuffer }

type LoadedGlb = {
  model: THREE.Group
  wasDisplayed: boolean
}

export function useGlbModel(source: string | ArrayBuffer) {
  const request = useMemo<GlbRequest>(() => ({ source }), [source])
  const [result, setResult] = useState<{
    request: GlbRequest
    loadedGlb?: LoadedGlb
    error?: string
  }>()
  const displayedGlb = result?.loadedGlb

  useEffect(() => {
    const controller = new AbortController()
    let loadedGlb: LoadedGlb | undefined
    loadGlbScene(request.source, controller.signal)
      .then((model) => {
        if (controller.signal.aborted) {
          disposeGlbScene(model)
          return
        }
        loadedGlb = { model, wasDisplayed: false }
        setResult({ request, loadedGlb })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setResult((previous) => ({
          request,
          loadedGlb: previous?.loadedGlb,
          error: error instanceof Error ? error.message : String(error),
        }))
      })
    return () => {
      controller.abort()
      if (loadedGlb && !loadedGlb.wasDisplayed) disposeGlbScene(loadedGlb.model)
    }
  }, [request])

  useLayoutEffect(() => {
    if (!displayedGlb) return
    // Once committed, the displayed model outlives its request.
    displayedGlb.wasDisplayed = true
    return () => disposeGlbScene(displayedGlb.model)
  }, [displayedGlb])

  return {
    model: displayedGlb?.model,
    isLoading: result?.request !== request,
    error: result?.request === request ? result.error : undefined,
  }
}
