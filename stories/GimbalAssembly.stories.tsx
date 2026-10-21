import { CadViewer } from "src/CadViewer"
import type { CameraController } from "src/hooks/cameraAnimation"
import gimbalAssembly from "./assets/gimbal-assembly.json"

const resolveStaticAsset = (modelUrl: string) => {
  const url = new URL(modelUrl)
  if (url.hostname === "modelcdn.tscircuit.com") {
    url.searchParams.set("cachebust_origin", window.location.origin)
    return url.toString()
  }
  return modelUrl
}

const showFullAssembly = (controller: CameraController | null) => {
  controller?.animateTo({
    position: [340, -480, 420],
    target: [0, -100, 0],
    durationMs: 0,
  })
}

// Gimbal One v0.1.4: one populated PCB, 50 rigid parts and four wiring harnesses.
// Right-click the background → Hide Assembly → Show Assembly.
export const GimbalAssembly = () => (
  <CadViewer
    circuitJson={gimbalAssembly}
    resolveStaticAsset={resolveStaticAsset}
    autoRotateDisabled
    onCameraControllerReady={showFullAssembly}
  />
)

export default {
  title: "Assembly/Gimbal",
  component: GimbalAssembly,
}
