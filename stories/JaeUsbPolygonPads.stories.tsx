import { Circuit } from "@tscircuit/core"
import { CadViewer } from "src/CadViewer"

// JAE DX07S024JJ2 footprint from the KiCad importer repro (MIT, tscircuit Inc.).
// https://github.com/rushabhcodes/kicad-to-circuit-json/blob/0aac6cd74e0dc63c1b9780a7573d10df8fc62aec/tests/repros/srj24-pad-geometry/sample004-j1.kicad_pcb
// The imported contour uses clockwise winding; JSCAD expects counterclockwise.
const shellPadOutline = [
  { x: 0, y: 0.6 },
  { x: -0.55, y: 0.6 },
  { x: -0.7796100594, y: 0.5543277195 },
  { x: -0.9742640687, y: 0.4242640687 },
  { x: -1.1043277195, y: 0.2296100594 },
  { x: -1.15, y: 0 },
  { x: -1.1043277195, y: -0.2296100594 },
  { x: -0.9742640687, y: -0.4242640687 },
  { x: -0.7796100594, y: -0.5543277195 },
  { x: -0.55, y: -0.6 },
  { x: 0, y: -0.6 },
  { x: 0.55, y: -0.6 },
  { x: 0.7796100594, y: -0.5543277195 },
  { x: 0.9742640687, y: -0.4242640687 },
  { x: 1.1043277195, y: -0.2296100594 },
  { x: 1.1081337429, y: -0.2104758878 },
  { x: 1.15, y: 0 },
  { x: 1.15, y: 0.6 },
  { x: 1.1081337429, y: 0.8104758878 },
  { x: 0.9889087297, y: 0.9889087297 },
  { x: 0.8104758878, y: 1.1081337429 },
  { x: 0.6, y: 1.15 },
  { x: 0.3895241122, y: 1.1081337429 },
  { x: 0.2110912703, y: 0.9889087297 },
  { x: 0.0918662571, y: 0.8104758878 },
  { x: 0.05, y: 0.6 },
]

const createCircuit = (pcbRotation: number) => {
  const circuit = new Circuit()

  circuit.add(
    <board width="16mm" height="16mm">
      <chip
        name="J1"
        manufacturerPartNumber="DX07S024JJ2"
        pcbX={0}
        pcbY={0}
        pcbRotation={pcbRotation}
        cadModel={null}
        pinLabels={{ pin1: "B12", pin2: "SH" }}
        footprint={
          <footprint>
            <smtpad
              portHints={["pin1"]}
              pcbX={-2.215}
              pcbY={-2.875}
              shape="rect"
              width={0.8}
              height={0.27}
            />
            <platedhole
              portHints={["pin2"]}
              pcbX={1.933}
              pcbY={-4.321}
              shape="pill"
              holeWidth={2.05}
              holeHeight={0.75}
              outerWidth={2.6}
              outerHeight={1.3}
            />
            <platedhole
              portHints={["pin2"]}
              pcbX={1.933}
              pcbY={4.32}
              shape="pill"
              holeWidth={2.05}
              holeHeight={0.75}
              outerWidth={2.6}
              outerHeight={1.3}
            />
            <platedhole
              portHints={["pin2"]}
              pcbX={-2.52}
              pcbY={-3.99}
              shape="pill"
              holeWidth={0.7}
              holeHeight={1.25}
              outerWidth={1}
              outerHeight={1.55}
            />
            <platedhole
              portHints={["pin2"]}
              pcbX={-2.52}
              pcbY={3.99}
              shape="pill"
              holeWidth={0.7}
              holeHeight={1.25}
              outerWidth={1}
              outerHeight={1.55}
            />
            <platedhole
              portHints={["pin2"]}
              pcbX={-3.12}
              pcbY={-4.32}
              shape="hole_with_polygon_pad"
              holeShape="pill"
              holeWidth={1.9}
              holeHeight={0.6}
              holeOffsetX={0}
              holeOffsetY={0}
              padOutline={shellPadOutline}
            />
            <platedhole
              portHints={["pin2"]}
              pcbX={-3.12}
              pcbY={4.32}
              shape="hole_with_polygon_pad"
              holeShape="pill"
              holeWidth={1.9}
              holeHeight={0.6}
              holeOffsetX={0}
              holeOffsetY={0}
              padOutline={shellPadOutline
                .toReversed()
                .map(({ x, y }) => ({ x, y: -y }))}
            />
          </footprint>
        }
      />
    </board>,
  )

  return circuit.getCircuitJson()
}

export const Unrotated = () => (
  <CadViewer circuitJson={createCircuit(0)} autoRotateDisabled />
)

export const Rotated90Degrees = () => (
  <CadViewer circuitJson={createCircuit(90)} autoRotateDisabled />
)

export const Rotated37Degrees = () => (
  <CadViewer circuitJson={createCircuit(37)} autoRotateDisabled />
)

export default {
  title: "Examples/JAE USB-C Polygon Pads",
  component: Unrotated,
}
