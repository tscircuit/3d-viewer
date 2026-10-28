import { useState } from "react"
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
export const ExportedCircuitJson = () => {
  const [pose, setPose] = useState<"assembled" | "exploded">("assembled")
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <CadViewer
        circuitJson={pose === "assembled" ? assembled : exploded}
        autoRotateDisabled
        onCameraControllerReady={frameAssembly}
      />
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          zIndex: 100,
          background: "#222",
          color: "white",
          padding: 12,
          borderRadius: 6,
          fontFamily: "sans-serif",
        }}
      >
        <label>
          RP2040 + NEMA17:{" "}
          <select
            aria-label="Exported assembly pose"
            value={pose}
            onChange={(event) => setPose(event.target.value as typeof pose)}
          >
            <option value="assembled">Assembled</option>
            <option value="exploded">Exploded</option>
          </select>
        </label>
        <div style={{ fontSize: 11, marginTop: 6 }}>
          Exported TSX poses · PCB remains fixed
        </div>
      </div>
    </div>
  )
}
export default {
  title: "Assembly/RP2040 motor controller",
  component: ExportedCircuitJson,
}
