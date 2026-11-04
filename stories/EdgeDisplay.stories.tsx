import { useEffect, useState } from "react"
import { CadViewer } from "../src/CadViewer"
import type { CameraController } from "../src/hooks/cameraAnimation"
import { lampCircuitJson } from "./edge-display/lamp"

const frameLamp = (controller: CameraController | null) =>
  controller?.animateTo({
    position: [65, -95, 125],
    target: [0, 0, 56],
    durationMs: 0,
  })

export const Lamp = () => (
  <div style={{ height: 640 }}>
    <CadViewer
      circuitJson={lampCircuitJson}
      autoRotateDisabled
      clickToInteractEnabled={false}
      onCameraControllerReady={frameLamp}
    />
  </div>
)

/** CadViewer reads its saved engine when it mounts. */
export const LampJscad = () => {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const previous = window.localStorage.getItem("cadViewerEngine")
    window.localStorage.setItem("cadViewerEngine", "jscad")
    setReady(true)
    return () => {
      if (previous === null) window.localStorage.removeItem("cadViewerEngine")
      else window.localStorage.setItem("cadViewerEngine", previous)
    }
  }, [])
  return ready ? <Lamp /> : null
}

export const LampGlb = () => (
  <div style={{ height: 640 }}>
    <CadViewer
      glbUrl={
        new URL(
          "./assets/prerendered-glb/edge-display-lamp.glb",
          import.meta.url,
        ).href
      }
      autoRotateDisabled
      clickToInteractEnabled={false}
      onCameraControllerReady={frameLamp}
    />
  </div>
)

export default {
  title: "Appearance/Edges",
  component: CadViewer,
  parameters: {
    docs: {
      description: {
        component:
          "Right-click the lamp and open Appearance → Edges for visible or hidden edges. Edge width supports 1–5 px. The hollow shade hides its collar and three support spokes. Use Engine in the context menu to compare Manifold and JSCAD; the GLB story uses the same checked-in lamp geometry.",
      },
    },
  },
}
