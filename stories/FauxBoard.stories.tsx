import { CadViewer } from "../src/CadViewer"

export const FauxBoard = () => (
  <CadViewer>
    <chip name="U1" footprint="dip8" />
  </CadViewer>
)

export const FauxBoardWithHole = () => (
  <CadViewer>
    <platedhole shape="circle" holeDiameter={1} outerDiameter={2} />
  </CadViewer>
)

export default {
  title: "FauxBoard",
  component: FauxBoard,
}
