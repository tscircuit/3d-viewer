import { Circuit } from "@tscircuit/core"
import { CadViewer } from "src/CadViewer"

const createPcbNoteDimensionCircuitJson = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="24mm" height="14mm">
      <pcbnoterect
        pcbX={0}
        pcbY={0}
        width="18mm"
        height="8mm"
        strokeWidth={0.2}
        color="#00D4FF"
      />
      <pcbnoteline
        x1={-9}
        y1={0}
        x2={9}
        y2={0}
        strokeWidth={0.2}
        color="#FFCC00"
      />
      <pcbnotepath
        route={[
          { x: -2, y: -2 },
          { x: 0, y: 2 },
          { x: 2, y: -2 },
        ]}
        strokeWidth={0.2}
        color="#FF5CAD"
      />
      <pcbnotetext
        pcbX={0}
        pcbY={-5}
        text="PCB NOTES"
        fontSize="1mm"
        color="#FFFFFF"
      />
      <pcbnotedimension
        from={{ x: -9, y: 4 }}
        to={{ x: 9, y: 4 }}
        offset="1.5mm"
        fontSize="1.2mm"
        arrowSize="0.8mm"
        color="#55FF55"
      />
    </board>,
  )

  return circuit.getCircuitJson()
}

const circuitJson = createPcbNoteDimensionCircuitJson()

/**
 * Reproduction for pcb_note_dimension elements appearing in the 3D viewer.
 * Expected: the note primitives render when PCB Notes are enabled, except for
 * the green dimension above the cyan rectangle.
 * Actual before the fix: the green dimension renders with the other notes.
 */
export const DimensionRendered = () => (
  <CadViewer circuitJson={circuitJson} autoRotateDisabled />
)

export default {
  title: "Repros/PCB Note Dimension Rendered",
  component: DimensionRendered,
}
