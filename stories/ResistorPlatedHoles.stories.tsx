import { useState, useEffect } from "react"
import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = async () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="40mm" height="30mm">
      <resistor
        name="R1"
        footprint="0805"
        resistance="4.7k"
        pcbX={-10}
        pcbY={0}
      />
      <resistor
        name="R2"
        footprint="0805"
        resistance="4.7k"
        pcbX={10}
        pcbY={0}
        layer="bottom"
        connections={{ pin1: ["U1.pin1", "R1.pin1"] }}
      />
      <platedhole
        shape="circle"
        holeDiameter={1.2}
        outerDiameter={2.6}
        pcbX={-15}
        pcbY={10}
      />

      <chip
        name="U1"
        footprint={
          <footprint>
            {" "}
            <platedhole
              shape="circular_hole_with_rect_pad"
              holeDiameter={1.2}
              rectPadWidth={3.4}
              rectPadHeight={2.6}
              portHints={["pin1"]}
              pcbX={0}
              pcbY={0.5}
            />
          </footprint>
        }
      />
      <platedhole
        shape="pill_hole_with_rect_pad"
        holeShape="pill"
        padShape="rect"
        holeWidth={1.2}
        holeHeight={2.6}
        rectPadWidth={3.6}
        rectPadHeight={3.2}
        pcbX={15}
        pcbY={10}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}

export const ResistorPlatedHoleShowcase = () => {
  const [circuitJson, setCircuitJson] = useState<any>(null)

  useEffect(() => {
    const renderCircuit = async () => {
      const json = await createCircuit()
      setCircuitJson(json)
    }
    renderCircuit()
  }, [])

  if (!circuitJson) {
    return <div>Loading...</div>
  }

  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "Plated Holes/Resistor with Plated Holes",
  component: ResistorPlatedHoleShowcase,
}
