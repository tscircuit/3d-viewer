import { useEffect } from "react"
import { useThree } from "./ThreeContext"

/**
 * Temporarily adjusts the renderer tone mapping exposure while a component is mounted.
 * This allows specific scenes (like imported GLB models) to tune exposure without
 * affecting unrelated tests that rely on the default lighting configuration.
 */
export const useRendererExposure = (exposure: number | null | undefined) => {
  const { renderer } = useThree()

  useEffect(() => {
    if (!renderer || exposure == null) return

    const previousExposure = renderer.toneMappingExposure
    renderer.toneMappingExposure = exposure

    return () => {
      renderer.toneMappingExposure = previousExposure
    }
  }, [renderer, exposure])
}
