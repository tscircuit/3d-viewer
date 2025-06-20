import { CadViewer } from "src/CadViewer"

export const PinHeaderBoard = () => (
  <CadViewer>
    <board width="10mm" height="10mm">
      <pinheader name="P1" footprint="pinrow2" pinCount={2} />
    </board>
  </CadViewer>
)

export default {
  title: "PinHeaderBoard",
  component: PinHeaderBoard,
}
