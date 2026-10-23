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

// Gimbal One v0.1.3: one populated PCB and 50 standalone mechanical CAD parts.
// Right-click → Appearance → Assembly: checked is on, unchecked is off.
export const GimbalAssembly = () => (
  <CadViewer
    circuitJson={gimbalAssembly}
    resolveStaticAsset={resolveStaticAsset}
    autoRotateDisabled
    onCameraControllerReady={showFullAssembly}
  />
)

// This published assembly predates component metadata. Hover REF_Phone to check its node label.
export const GimbalLegacyGlb = () => (
  <CadViewer
    glbUrl="https://api.tscircuit.com/package_files/download?package_file_id=8fbcea4b-5ced-41d6-b9f2-335670a81eac"
    autoRotateDisabled
    onCameraControllerReady={showFullAssembly}
  />
)

export default {
  title: "Assembly/Gimbal",
  component: GimbalAssembly,
}
