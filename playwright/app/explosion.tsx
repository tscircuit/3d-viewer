import React, { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import type { CameraController } from "../../src/hooks/cameraAnimation"
import { CadViewer } from "../../src/CadViewer"
import { explosionAssembly } from "../../stories/fixtures/explosion-assembly"

localStorage.setItem(
  "cadViewerEngine",
  new URLSearchParams(location.search).get("engine") ?? "manifold",
)
const frameAssembly = (controller: CameraController | null) =>
  controller?.animateTo({
    position: [65, -85, 65],
    target: [10, 0, 15],
    durationMs: 0,
  })
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div style={{ width: 900, height: 700 }}>
      <CadViewer autoRotateDisabled onCameraControllerReady={frameAssembly}>
        {explosionAssembly}
      </CadViewer>
    </div>
  </StrictMode>,
)
