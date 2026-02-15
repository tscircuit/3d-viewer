import { CadViewer } from "src/CadViewer"

export const SingleLayerBoard = () => (
  <CadViewer>
     <board width="20mm" height="20mm" layers={1}>
      <resistor
        name="R1"
        resistance="1k"
        footprint="0805"
        layer="top"
        pcbX={-5}
      />
      <capacitor
        name="C1"
        capacitance="100nF"
        footprint="0805"
        layer="top"
        pcbX={0}
      />
      <led name="LED1" footprint="0805" layer="top" pcbX={5} />
      <trace from=".R1 > .pin2" to=".C1 > .pin1" />
      <trace from=".C1 > .pin2" to=".LED1 > .pin1" />
    </board>
  </CadViewer>
)

export default {
  title: "SingleLayerBoard",
  component: SingleLayerBoard,
}
