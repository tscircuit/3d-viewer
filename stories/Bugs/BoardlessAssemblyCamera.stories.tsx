import { Circuit, assembly } from "@tscircuit/core"
import { CadViewer } from "src/CadViewer"

// A 38 x 36 x 12.8 mm part. Its closed shell surrounds the initial camera
// [5, -5, 5] selected when the assembly has no pcb_board record.
const boxObj = `v -19 -18 0
v 19 -18 0
v 19 18 0
v -19 18 0
v -19 -18 12.8
v 19 -18 12.8
v 19 18 12.8
v -19 18 12.8
f 1 3 2
f 1 4 3
f 5 6 7
f 5 7 8
f 1 2 6
f 1 6 5
f 2 3 7
f 2 7 6
f 3 4 8
f 3 8 7
f 4 1 5
f 4 5 8`

const circuit = new Circuit()
circuit.add(
  <assembly.device name="boardless-device">
    <assembly.part
      name="DOCK_BASE"
      cadModel={{
        objUrl: `data:text/plain,${encodeURIComponent(boxObj)}`,
        modelUnitToMmScale: 1,
        showAsTranslucentModel: false,
      }}
    />
  </assembly.device>,
)
const circuitJson = circuit.getCircuitJson()

// Expected: an exterior overview with DOCK_BASE visible and selectable.
// Actual: camera starts inside the closed shell; zoom out to find the part.
// No board, fake PCB, remote model, or project-specific code is needed.
export const ClosedMechanicalPart = () => (
  <CadViewer circuitJson={circuitJson} autoRotateDisabled />
)

export default {
  title: "Bugs/Boardless Assembly Initial Camera",
  component: ClosedMechanicalPart,
}
