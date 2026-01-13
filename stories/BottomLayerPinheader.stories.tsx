import { CadViewer } from "src/CadViewer"

export const BottomLayerPinheader = () => {
  return (
    <CadViewer>
      <board width="30mm" height="30mm">
        {/* Top layer pin header - should be on top of board */}
        <pinheader
          gender="male"
          pinCount={4}
          name="P1"
          pcbX={-5}
          pcbY={0}
          layer="top"
        />
        {/* Bottom layer pin header - should be on bottom of board */}
        <pinheader
          gender="male"
          pinCount={4}
          name="P2"
          pcbX={5}
          pcbY={0}
          layer="bottom"
        />
      </board>
    </CadViewer>
  )
}

export default {
  title: "Bugs/BottomLayerPinheader",
  component: BottomLayerPinheader,
}
