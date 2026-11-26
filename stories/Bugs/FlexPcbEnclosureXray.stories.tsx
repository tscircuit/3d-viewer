import { CadViewer } from "src/CadViewer"
import { createFlexEnclosureXray } from "../fixtures/create-flex-enclosure-xray"

const circuitJson = createFlexEnclosureXray()

export const OpaqueRing = () => (
  <div style={{ height: "90vh", display: "flex", flexDirection: "column" }}>
    <p>
      Orbit the ring, especially at grazing angles. The enclosed flex PCB and
      copper should stay hidden behind the opaque shell. Repro: copper/board
      surfaces can appear through it. Hide the enclosure from its context menu
      to inspect the PCB inside.
    </p>
    <div style={{ flex: 1, minHeight: 0 }}>
      <CadViewer circuitJson={circuitJson} foldPcbs autoRotateDisabled />
    </div>
  </div>
)

export default { title: "Bugs/Flex PCB Enclosure Xray" }
