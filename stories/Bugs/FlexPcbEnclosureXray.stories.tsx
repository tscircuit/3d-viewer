import { Circuit, assembly, jscad } from "@tscircuit/core"
import { CadViewer } from "src/CadViewer"

// Simplified from https://tscircuit.com/abse/smart-ring-flex#3d
// Four quarter-circle bends wrap a thin flex PCB around a 10 mm radius.
// Small straight gaps keep adjacent bend regions from overlapping.
const radius = 10
const arcLength = (Math.PI * radius) / 2
const gap = 0.01
const length = 4 * arcLength + 3 * gap

const circuit = new Circuit()
circuit.add(
  <assembly.device name="flex-ring-xray-repro">
    <board
      width={length}
      height={4}
      pcbX={length / 2}
      thickness={0.15}
      material="flex"
      schematicDisabled
      routingDisabled
    >
      {[0, 1, 2, 3].map((i) => (
        <pcbbend
          key={i}
          name={`B${i + 1}`}
          x1={i * (arcLength + gap) + arcLength / 2 - length / 2}
          x2={i * (arcLength + gap) + arcLength / 2 - length / 2}
          y1={-2}
          y2={2}
          bendAngle={90}
          bendRadius={radius}
          bendSide="right"
        />
      ))}
    </board>
    <assembly.printedpart
      name="opaque-ring-enclosure"
      jscad={
        <jscad.colorize color="#bfc5c7">
          <jscad.translate offset={[0, 0, radius]}>
            <jscad.rotate angles={[Math.PI / 2, 0, 0]}>
              <jscad.subtract>
                <jscad.cylinder radius={10.4} height={6} />
                <jscad.cylinder radius={9.6} height={8} />
              </jscad.subtract>
            </jscad.rotate>
          </jscad.translate>
        </jscad.colorize>
      }
    />
  </assembly.device>,
)

// Explicit copper on both faces avoids routing or remote component models.
const circuitJson = circuit.getCircuitJson()
for (const layer of ["top", "bottom"] as const) {
  circuitJson.push({
    type: "pcb_trace",
    pcb_trace_id: `ring-trace-${layer}`,
    route: [
      { route_type: "wire", x: 0.5, y: -1.4, width: 0.3, layer },
      { route_type: "wire", x: length - 0.5, y: -1.4, width: 0.3, layer },
      { route_type: "wire", x: length - 0.5, y: 1.4, width: 0.3, layer },
      { route_type: "wire", x: 0.5, y: 1.4, width: 0.3, layer },
    ],
  })
}

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
