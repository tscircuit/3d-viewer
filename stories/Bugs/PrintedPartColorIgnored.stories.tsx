import { Circuit, assembly, jscad } from "@tscircuit/core"
import { CadViewer } from "src/CadViewer"

// Found on Done Dot's red status lens: cad_component.color is ignored,
// while the same color embedded in the JSCAD geometry renders correctly.
const circuit = new Circuit()
circuit.add(
  <assembly.device name="printed-part-color-repro">
    <board width={24} height={12} />
    <assembly.printedpart
      name="PROP_RED"
      jscad={<jscad.cylinder radius={2} height={3} center={[-5, 0, 2.3]} />}
    />
    <assembly.printedpart
      name="GEOMETRY_RED"
      jscad={
        <jscad.colorize color="#d73e39">
          <jscad.cylinder radius={2} height={3} center={[5, 0, 2.3]} />
        </jscad.colorize>
      }
    />
  </assembly.device>,
)
// Match the cad_component.color emitted by Done Dot's newer core. Keeping the
// viewer input explicit avoids updating this repo's older printedpart prop types.
const circuitJson = circuit
  .getCircuitJson()
  .map((element) =>
    element.type === "cad_component"
      ? { ...element, color: "#d73e39" }
      : element,
  )

export const SameRedColor = () => (
  <div style={{ width: 1000, fontFamily: "sans-serif" }}>
    <h2>Printed part color is ignored</h2>
    <p>
      Both cylinders should be red. Left: cad_component.color (renders gray).
      Right: JSCAD colorize with the same red (renders red).
    </p>
    <div style={{ height: 640 }}>
      <CadViewer
        circuitJson={circuitJson}
        autoRotateDisabled
        clickToInteractEnabled={false}
      />
    </div>
  </div>
)

export default {
  title: "Bugs/PrintedPartColorIgnored",
  component: SameRedColor,
}
