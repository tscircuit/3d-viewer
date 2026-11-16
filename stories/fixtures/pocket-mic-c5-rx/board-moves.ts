import type { AssemblyExplosionBoardMove } from "../../../src"

// The port openings allow vertical removal before the PCB moves past the tray.
export const pocketMicC5RxBoardMoves: readonly AssemblyExplosionBoardMove[] = [
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
