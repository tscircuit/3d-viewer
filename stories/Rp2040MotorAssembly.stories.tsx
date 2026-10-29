import type { CameraController } from "../src/hooks/cameraAnimation"
import { CadViewer } from "../src/CadViewer"
import assembled from "./fixtures/rp2040-motor-assembly/assembled.circuit.json"
// The exported JSON includes authored stage/move records and assembled geometry.
const frameAssembly = (controller: CameraController | null) =>
  controller?.animateTo({
    position: [80, -110, 82],
    target: [0, 0, -8],
    durationMs: 0,
  })
export const ExportedCircuitJson = () => (
  <CadViewer
    circuitJson={assembled}
    autoRotateDisabled
    onCameraControllerReady={frameAssembly}
  />
)
export default {
  title: "Assembly/RP2040 motor controller",
  component: ExportedCircuitJson,
}
