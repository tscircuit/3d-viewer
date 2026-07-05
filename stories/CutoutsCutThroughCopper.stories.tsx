import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

// The cutout positions come from a reference image of the original board.
// The reference frame spans x 102.8..137.6 (34.8mm board width) with y
// increasing downward, so these helpers convert to centered board coords.
const REF_CENTER_X = 120.2
const REF_CENTER_Y = 78.95

const modulePadPosition = (x: number, y: number) => ({
  pcbX: Number((x - REF_CENTER_X).toFixed(3)),
  pcbY: Number((REF_CENTER_Y - y).toFixed(3)),
})

const edgeHole = (x: number, y: number) => ({
  pcbX: x - REF_CENTER_X,
  pcbY: REF_CENTER_Y - y,
  radius: 0.6,
})

const ModulePad = ({
  name,
  label,
  pcbX,
  pcbY,
  side,
}: {
  name: string
  label: string
  pcbX: number
  pcbY: number
  side: "left" | "right"
}) => {
  const padX = side === "left" ? -0.5 : 0.5

  return (
    <chip
      name={name}
      pcbX={pcbX}
      pcbY={pcbY}
      footprint={
        <footprint>
          <smtpad
            layer="top"
            shape="rect"
            pcbX={`${padX}mm`}
            pcbY="0mm"
            width="2mm"
            height="6mm"
            portHints={["pin1"]}
          />
          <smtpad
            layer="bottom"
            shape="rect"
            pcbX={`${padX}mm`}
            pcbY="0mm"
            width="2mm"
            height="6mm"
            portHints={["pin1"]}
          />
        </footprint>
      }
      pinLabels={{ pin1: label }}
    />
  )
}

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board
      width="34.8mm"
      height="30mm"
      autorouterVersion="v4"
      layers={2}
      minViaPadDiameter={0.45}
      minViaHoleDiameter={0.3}
    >
      <ModulePad
        name="J8"
        label="VIN"
        {...modulePadPosition(104.5, 67.7)}
        side="left"
      />
      <ModulePad
        name="J1"
        label="nCE"
        {...modulePadPosition(104.6, 75.2)}
        side="left"
      />
      <ModulePad
        name="J6"
        label="ON_OFF"
        {...modulePadPosition(104.6, 82.6)}
        side="left"
      />
      <ModulePad
        name="J7"
        label="ALM"
        {...modulePadPosition(104.5, 90.2)}
        side="left"
      />
      <ModulePad
        name="J2"
        label="VOUT"
        {...modulePadPosition(135.7, 67.7)}
        side="right"
      />
      <ModulePad
        name="J3"
        label="GND"
        {...modulePadPosition(135.9, 75.1)}
        side="right"
      />
      <ModulePad
        name="J5"
        label="SDA"
        {...modulePadPosition(135.9, 82.9)}
        side="right"
      />
      <ModulePad
        name="J4"
        label="SCL"
        {...modulePadPosition(135.8, 90.2)}
        side="right"
      />

      <cutout shape="circle" {...edgeHole(102.8, 67.7)} />
      <cutout shape="circle" {...edgeHole(102.9, 75.2)} />
      <cutout shape="circle" {...edgeHole(102.9, 82.6)} />
      <cutout shape="circle" {...edgeHole(102.8, 90.2)} />
      <cutout shape="circle" {...edgeHole(137.4, 67.7)} />
      <cutout shape="circle" {...edgeHole(137.6, 75.2)} />
      <cutout shape="circle" {...edgeHole(137.6, 82.8)} />
      <cutout shape="circle" {...edgeHole(137.5, 90.2)} />
    </board>,
  )

  return circuit.getCircuitJson()
}

export const edgeCutoutsCutThroughSmtPadsStory = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "Edge Cutouts Cut Through SMT Pads",
  component: edgeCutoutsCutThroughSmtPadsStory,
}
