import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="30mm" height="30mm">
      <chip
        name="H1"
        pcbX={0}
        pcbY={0}
        cadModel={{
          objUrl: "/stories/assets/myObj.obj",
          rotationOffset: { x: 90, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0.6 },
        }}
        footprint={
          <footprint>
            <hole diameter="0.8mm" pcbX={0} pcbY={0} />
          </footprint>
        }
      />
    </board>,
  )

  return circuit.getCircuitJson()
}

export const Default = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "OpenCascadeObj",
  component: Default,
}
