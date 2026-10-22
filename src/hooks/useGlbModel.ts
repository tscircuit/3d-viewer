import { useEffect, useMemo, useState } from "react"
import type * as THREE from "three"
import { disposeGlbScene, loadGlbScene } from "../utils/prerendered-glb"

/** Each source change owns its load and resources, including A -> B -> A. */
export function useGlbModel(source: string | ArrayBuffer) {
  const request = useMemo(() => ({ source }), [source])
  const [result, setResult] = useState<{
    request: { source: string | ArrayBuffer }
    model?: THREE.Group
    error?: string
  }>()
  useEffect(() => {
    const controller = new AbortController()
    let model: THREE.Group | undefined
    loadGlbScene(request.source, controller.signal)
      .then((loaded) => {
        model = loaded
        if (controller.signal.aborted) disposeGlbScene(loaded)
        else setResult({ request, model: loaded })
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({
            request,
            error: error instanceof Error ? error.message : String(error),
          })
      })
    return () => {
      controller.abort()
      if (model) disposeGlbScene(model)
    }
  }, [request])

  return result?.request === request ? result : undefined
}
