import type { AnyCircuitElement } from "circuit-json"
import { CadViewer, type CadViewerProps } from "../src/CadViewer"
import type { CameraController } from "../src/hooks/cameraAnimation"
import pocketMicC5RxJson from "./fixtures/pocket-mic-c5-rx/assembled.circuit.json?raw"

const pocketMicC5Rx = JSON.parse(pocketMicC5RxJson) as AnyCircuitElement[]
const boardMoves: CadViewerProps["assemblyExplosionBoardMoves"] = [
  {
    stageName: "pocket-rx.lift-pcb",
    pcbBoardId: "pcb_board_0",
    translation: [0, 0, 12],
  },
  {
    stageName: "pocket-rx.park-pcb",
    pcbBoardId: "pcb_board_0",
    translation: [0, 36, 0],
  },
]

const frameReceiver = (controller: CameraController | null) =>
  controller?.animateTo({
    position: [67, -20, 59],
    target: [0, 12, 9],
    durationMs: 0,
  })

export const BoardRemoval = () => (
  <CadViewer
    circuitJson={pocketMicC5Rx}
    assemblyExplosionBoardMoves={boardMoves}
    autoRotateDisabled
    onCameraControllerReady={frameReceiver}
  />
)

export default {
  title: "Assembly/Pocket Mic C5 RX",
  component: BoardRemoval,
  parameters: {
    docs: {
      description: {
        story:
          "Right-click the receiver and choose Advanced → Exploded view to lift and park the populated PCB.",
      },
    },
  },
}
