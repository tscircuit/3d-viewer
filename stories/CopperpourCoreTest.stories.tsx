import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="30mm" height="30mm">
      <silkscreenrect height="1mm" width="1mm" layer="top" />
      <silkscreencircle radius="1mm" layer="top" pcbX="7mm" pcbY="1mm" />
      <silkscreenline
        strokeWidth="0.1mm"
        layer="top"
        x1="3mm"
        y1="3mm"
        x2="5mm"
        y2="5mm"
      />
      <silkscreenpath
        layer="top"
        route={[
          { x: "1mm", y: "1mm" },
          { x: "2mm", y: "2mm" },
          { x: "3mm", y: "1mm" },
        ]}
      />
      <silkscreentext layer="top" pcbX="1mm" pcbY="5mm" text="Tscircuit" />
      <copperpour
        connectsTo="net.GND"
        layer="top"
        coveredWithSolderMask
        name="PourTop"
      />
      <copperpour
        connectsTo="net.GND"
        layer="bottom"
        coveredWithSolderMask
        name="PourBottom"
      />
    </board>,
  )

  return circuit.getCircuitJson()
}

export const CopperpourCoreTestStory = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson} />
}

export default {
  title: "Copperpour Core Test",
  component: CopperpourCoreTestStory,
}
