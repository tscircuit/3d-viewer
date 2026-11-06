import { Circuit, assembly } from "@tscircuit/core"
import { useMemo } from "react"
import { CadViewer } from "../src/CadViewer"

const scene = (
  <assembly.device name="hide-repro">
    <board name="main-board" width={30} height={20} routingDisabled>
      <chip
        name="U1"
        footprint="soic8"
        pcbX={-7}
        cadModel={{ jscad: { type: "cube", size: 3 } }}
      />
      <chip
        name="U2"
        footprint="soic8"
        pcbX={7}
        cadModel={{ jscad: { type: "cube", size: 3 } }}
      />
    </board>
    <assembly.subassembly name="mechanical-assembly">
      <assembly.part
        name="mechanical-block"
        cadModel={{
          jscad: { type: "cube", size: 8 },
          positionOffset: { x: 25, y: 0, z: 4 },
        }}
      />
    </assembly.subassembly>
  </assembly.device>
)

export const BoardAndAssembly = () => {
  // Match the synchronous TSX compilation used by Assembly/Screen. Passing
  // children makes CadViewer wait for asynchronous settlement and hides errors.
  const result = useMemo(() => {
    try {
      const circuit = new Circuit()
      circuit.add(scene)
      const circuitJson = circuit.getCircuitJson()
      if (!circuitJson.some((element) => element.type === "pcb_board")) {
        throw new Error("The repro did not generate a PCB.")
      }
      return { circuitJson }
    } catch (error) {
      return { error: String(error) }
    }
  }, [])

  return (
    <div style={{ height: "95vh", display: "flex", flexDirection: "column" }}>
      <p style={{ flexShrink: 0 }}>
        Right-click the mechanical block and hide it, then unhide all components.
        Right-click the PCB: it should offer Hide "main-board" and hide the board
        together with U1 and U2, while leaving the mechanical assembly visible.
        Currently the PCB has no equivalent board-level hide action.
      </p>
      {result.error ? (
        <pre role="alert">{result.error}</pre>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <CadViewer circuitJson={result.circuitJson} autoRotateDisabled />
        </div>
      )}
    </div>
  )
}

export default {
  title: "Repros/Board Hide",
  component: BoardAndAssembly,
}
