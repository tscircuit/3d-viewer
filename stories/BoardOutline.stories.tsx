import { CadViewer } from "src/CadViewer"
import soic_soup from "./assets/soic-with-traces-no-board.json"
import type { AnySoupElement } from "@tscircuit/soup"

export const AtariBoardOutline = () => {
  return (
    <CadViewer
      soup={(soic_soup as AnySoupElement[]).concat({
        type: "pcb_board",
        center: {
          x: 0,
          y: 0,
        },
        width: 20,
        height: 20,
        outline: [
          { x: -22.5, y: 24.5 },
          { x: 22.5, y: 24.5 },
          { x: 22.5, y: 16.5 },
          { x: 20.5, y: 16.5 },
          { x: 20.5, y: 12.5 },
          { x: 22.5, y: 12.5 },
          { x: 22.5, y: 2.5 },
          { x: 18, y: -1.5 },
          { x: 18, y: -18 },
          { x: -18, y: -18 },
          { x: -18, y: -1.5 },
          { x: -22.5, y: 2.5 },
          { x: -22.5, y: 12.5 },
          { x: -20.5, y: 12.5 },
          { x: -20.5, y: 16.5 },
          { x: -22.5, y: 16.5 },
          { x: -22.5, y: 24.5 },
        ],
      })}
    />
  )
}

export const StarBoardOutline = () => {
  return (
    <CadViewer
      soup={(soic_soup as AnySoupElement[]).concat({
        type: "pcb_board",
        center: {
          x: 0,
          y: 0,
        },
        width: 20,
        height: 20,
        outline: [
          { x: 0, y: 25 },
          { x: 5, y: 15 },
          { x: 15, y: 12.5 },
          { x: 8.5, y: 5 },
          { x: 10, y: -7.5 },
          { x: 0, y: -2.5 },
          { x: -10, y: -7.5 },
          { x: -8.5, y: 5 },
          { x: -15, y: 12.5 },
          { x: -5, y: 15 },
        ],
      })}
    />
  )
}

export default {
  title: "BoardOutline",
  component: AtariBoardOutline,
}
