import type { CameraController } from "../src/hooks/cameraAnimation"
import { CadViewer } from "../src/CadViewer"
import assembled from "./fixtures/rp2040-motor-assembly/assembled.circuit.json"
import explodedPositions from "./fixtures/rp2040-motor-assembly/exploded-positions.json"

// These are two exported poses, not a serialized explosion sequence. Circuit
// JSON currently has no records for the authored stages in assembly.tsx.
const exploded = assembled.map((record) => {
  if (record.type !== "cad_component") return record
  const position = (
    explodedPositions as Record<string, { x: number; y: number; z: number }>
  )[(record as any).cad_component_id]
  return position ? { ...record, position } : record
})
const frameAssembly = (controller: CameraController | null) =>
  controller?.animateTo({
    position: [80, -110, 82],
    target: [0, 0, -8],
    durationMs: 0,
  })
export const ExportedCircuitJson = () => (
  <CadViewer
    circuitJson={assembled}
    explodedCircuitJson={exploded as any}
    autoRotateDisabled
    onCameraControllerReady={frameAssembly}
  />
)
export default {
  title: "Assembly/RP2040 motor controller",
  component: ExportedCircuitJson,
}
