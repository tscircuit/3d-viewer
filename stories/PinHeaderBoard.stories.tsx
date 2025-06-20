import { CadViewer } from "src/CadViewer"

export const PinHeaderBoard = () => (
  <CadViewer>
    <board>
      <pinheader name="P1" footprint="pinrow2" pinCount={2} />
    </board>
  </CadViewer>
)

export default {
  title: "PinHeaderBoard",
  component: PinHeaderBoard,
}
