import { Circuit, assembly } from "@tscircuit/core"
import { CadViewer } from "src/CadViewer"

const OledBoard = () => (
  <assembly.device name="oled-board">
    <board name="B1" width={44} height={36} routingDisabled>
      <connector
        name="J1"
        pinCount={30}
        pcbY={-13}
        footprint="fpc30_p0.5mm_pw0.3mm_pl1.25mm_mpx17.58mm_mpy2.325mm_mpw2mm_mpl3mm_mounttop"
      />
      <resistor name="R1" resistance="10k" footprint="0603" pcbX={-17} />
    </board>
    <assembly.subassembly name="display">
      <assembly.screen
        name="SCREEN"
        connectsTo=".B1 .J1"
        cadModel="flexscreen_w26.7mm_h19.26mm_screenthickness1.45mm_bezelinset1mm_bezeldepth0.5mm_activew21.744mm_activeh10.864mm_flex12mm_flexwidth15.5mm_flexthickness0.3mm_conductors30_conductorpitch0.5mm_conductorwidth0.3mm_edgemargin0.35mm_contactlength4mm_stiffenerlength4.5mm_stiffenerthickness0.12mm_sitsflat_cablestarty4.285mm_cablestartz1.1mm_hideconductors_screencolor(#071c18)_bezelcolor(#171a1d)"
      />
    </assembly.subassembly>
  </assembly.device>
)

const circuit = new Circuit()
circuit.add(<OledBoard />)
const circuitJson = circuit.getCircuitJson()

export const OledScreen = () => <CadViewer circuitJson={circuitJson} />

export default {
  title: "Assembly/Screen",
  component: OledScreen,
}
