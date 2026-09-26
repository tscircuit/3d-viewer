import { Circuit } from "@tscircuit/core"
import { useMemo, useState } from "react"
import { CadViewer } from "src/CadViewer"
import type { ViewSchematicComponentEvent } from "src/utils/pick-schematic-component"

export const Default = () => {
  const [enabled, setEnabled] = useState(true)
  const [selected, setSelected] = useState<ViewSchematicComponentEvent>()
  const circuitJson = useMemo(() => {
    const circuit = new Circuit()
    circuit.add(
      <board width="24mm" height="16mm" routingDisabled>
        <chip name="U1" footprint="soic8" pcbX={-5} />
        <chip name="U2" footprint="dip8" pcbX={5} />
      </board>,
    )
    return circuit.getCircuitJson()
  }, [])
  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />{" "}
        Enable schematic navigation
      </label>
      <p>
        Right-click either component and choose “Show on schematic”. Try both
        rendering engines.
      </p>
      <p role="status">
        {selected
          ? `${selected.refdes}: ${selected.source_component_id} (${selected.pcb_component_id})`
          : "No component selected"}
      </p>
      <div style={{ height: 500 }}>
        <CadViewer
          circuitJson={circuitJson}
          autoRotateDisabled
          onViewSchematicComponent={enabled ? setSelected : undefined}
        />
      </div>
    </div>
  )
}
export default { title: "Show on schematic" }
