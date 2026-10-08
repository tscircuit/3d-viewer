import { useEffect, useRef, type MutableRefObject } from "react"
import type { ThreeContextState } from "../react-three/ThreeContext"
import {
  applyExplodedViewToScene,
  createExplodedViewSceneState,
  resetExplodedViewScene,
} from "../utils/apply-exploded-view"
import type { ExplodedViewSceneConfig } from "../utils/exploded-view-types"

const scheduleAnimationFrame = (callback: FrameRequestCallback) => {
  if (typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback)
  }
  return window.setTimeout(() => callback(Date.now()), 16)
}

const cancelAnimationFrame = (frameHandle: number) => {
  if (typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(frameHandle)
  } else {
    window.clearTimeout(frameHandle)
  }
}

export const useExplodedViewScene = ({
  explodedViewAmount,
  explodedViewSceneConfig,
  sceneRef,
  sceneRevisionKey,
}: {
  explodedViewAmount: number
  explodedViewSceneConfig: ExplodedViewSceneConfig
  sceneRef: MutableRefObject<ThreeContextState | null>
  sceneRevisionKey: string
}) => {
  const explodedViewSceneStateRef = useRef(createExplodedViewSceneState())

  useEffect(() => {
    return () => {
      resetExplodedViewScene(explodedViewSceneStateRef.current)
      explodedViewSceneStateRef.current = createExplodedViewSceneState()
    }
  }, [sceneRevisionKey])

  useEffect(() => {
    let frameHandle: number | undefined
    let startedAt: number | undefined

    const updateExplodedView = (timestamp: number) => {
      startedAt ??= timestamp
      const rootObject = sceneRef.current?.rootObject
      if (!rootObject) {
        if (timestamp - startedAt < 10_000) {
          frameHandle = scheduleAnimationFrame(updateExplodedView)
        }
        return
      }

      const updateResult = applyExplodedViewToScene({
        rootObject,
        explodedViewAmount,
        explodedViewSceneConfig,
        explodedViewSceneState: explodedViewSceneStateRef.current,
      })

      if (!updateResult.ready && timestamp - startedAt < 10_000) {
        frameHandle = scheduleAnimationFrame(updateExplodedView)
      }
    }

    frameHandle = scheduleAnimationFrame(updateExplodedView)
    return () => {
      if (frameHandle !== undefined) cancelAnimationFrame(frameHandle)
    }
  }, [explodedViewAmount, explodedViewSceneConfig, sceneRef, sceneRevisionKey])
}
