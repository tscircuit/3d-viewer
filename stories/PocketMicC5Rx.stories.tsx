import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "../src/CadViewer"
import type { CameraController } from "../src/hooks/cameraAnimation"
import pocketMicC5RxJson from "./fixtures/pocket-mic-c5-rx/assembled.circuit.json?raw"
import { pocketMicC5RxBoardMoves } from "./fixtures/pocket-mic-c5-rx/board-moves"

const pocketMicC5Rx = JSON.parse(pocketMicC5RxJson) as AnyCircuitElement[]

const frameReceiver = (controller: CameraController | null) =>
  controller?.animateTo({
    position: [67, -20, 59],
    target: [0, 12, 9],
    durationMs: 0,
  })

export const BoardRemoval = () => (
  <CadViewer
    circuitJson={pocketMicC5Rx}
    assemblyExplosionBoardMoves={pocketMicC5RxBoardMoves}
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
