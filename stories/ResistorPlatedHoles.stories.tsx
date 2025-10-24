import React, { useEffect, useState } from "react"
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
      />
      <platedhole
        name="PH_CIRCLE"
        shape="circle"
        holeDiameter={1.2}
        outerDiameter={2.6}
        portHints={["PH_CIRCLE", "1"]}
        pcbX={-15}
        pcbY={10}
      />
      <platedhole
        name="PH_RECT"
        shape="circular_hole_with_rect_pad"
        holeDiameter={1.2}
        rectPadWidth={3.4}
        rectPadHeight={2.6}
        portHints={["PH_RECT", "1"]}
        pcbX={0}
        pcbY={10}
      />
      <platedhole
        name="PH_PILL"
        shape="pill_hole_with_rect_pad"
        holeShape="pill"
        padShape="rect"
        holeWidth={1.2}
        holeHeight={2.6}
        rectPadWidth={3.6}
        rectPadHeight={3.2}
        portHints={["PH_PILL", "1"]}
        pcbX={15}
        pcbY={10}
      />
      <trace from=".R1 > .pin1" to=".PH_CIRCLE > .1" thickness="0.3mm" />
      <trace from=".R1 > .pin2" to=".PH_RECT > .1" thickness="0.3mm" />
      <trace from=".R2 > .pin1" to=".PH_RECT > .1" thickness="0.3mm" />
      <trace from=".R2 > .pin2" to=".PH_PILL > .1" thickness="0.3mm" />
      <trace path={[".PH_CIRCLE > .1", ".PH_PILL > .1"]} thickness="0.3mm" />
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
