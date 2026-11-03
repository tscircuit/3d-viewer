import { assembly } from "@tscircuit/core"
import { CadViewer } from "../src/CadViewer"

export const BoardAndAssembly = () => (
  <div>
    <p>
      Right-click the mechanical block and hide it, then unhide all components.
      Right-click the PCB: it should offer Hide "main-board" and hide the board
      together with U1 and U2, while leaving the mechanical assembly visible.
      Currently the PCB has no equivalent board-level hide action.
    </p>
    <CadViewer autoRotateDisabled>
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
    </CadViewer>
  </div>
)

export default {
  title: "Repros/Board Hide",
  component: BoardAndAssembly,
}
