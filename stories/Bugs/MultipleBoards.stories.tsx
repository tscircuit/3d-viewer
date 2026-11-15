import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "src/CadViewer"
import twoBoards from "../assets/two-boards.json"

/**
 * Two `<board />`s inside one `<assembly.device />`, the second offset by
 * pcbY=28. Each board should be drawn with its own copper, soldermask and
 * silkscreen.
 */
export const TwoBoardsInOneDevice = () => (
  <CadViewer
    circuitJson={twoBoards as AnyCircuitElement[]}
    autoRotateDisabled
  />
)

export default {
  title: "Bugs/MultipleBoards",
  component: TwoBoardsInOneDevice,
}
