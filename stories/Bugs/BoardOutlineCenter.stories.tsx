import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const outline = [
  { x: 0, y: 0 },
  { x: 66, y: 0 },
  { x: 66, y: 5 },
  { x: 68.5, y: 7.5 },
  { x: 68.5, y: 40.25 },
  { x: 66, y: 42.75 },
  { x: 66, y: 56.75 },
  { x: 64.5, y: 58.25 },
  { x: 0, y: 58.25 },
]

const createCircuit = () => {
  const circuit = new Circuit()
  circuit.add(
    <board outline={outline}>
      <jumper
        name="J2"
        footprint="pinrow10_rows2_nosquareplating"
        cadModel={null}
        pinLabels={{
          pin1: "GND",
          pin9: "GND",
          pin8: "GND",
          pin7: "VDD",
          pin2: "!RESET",
          pin4: "~D19/A3",
          pin5: "SWDCK",
          pin6: "SWDIO",
        }}
        pcbX={46.99}
        pcbY={37.338}
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
  title: "Bugs/Board Outline Center",
  component: Default,
}
