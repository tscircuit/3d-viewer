import { transformCircuitJsonCadComponents } from "@tscircuit/flex-utils"
import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useState } from "react"
import { CadViewer } from "../src/CadViewer"

export default { title: "Flex PCB" }

const radius = 6
const pitch = 22
const neckHalfWidth = 1.25
const alpha = Math.asin(neckHalfWidth / radius)
const arc = (cx: number, from: number, to: number) => {
  const count = Math.ceil((to - from) / (Math.PI / 48))
  return Array.from({ length: count + 1 }, (_, i) => ({
    x: cx + radius * Math.cos(from + ((to - from) * i) / count),
    y: radius * Math.sin(from + ((to - from) * i) / count),
  }))
}

// Circuit JSON: right-handed, +Z above the board, millimeters. Two opposite
// U-folds (four quarter turns) stack the three discs 6 mm apart.
const bendSpacing = 6 + Math.PI / 2 - 2
const a = (pitch - bendSpacing) / 2
const b = (pitch + bendSpacing) / 2

async function createCircuit() {
  const circuit = new Circuit()
  circuit.add(
    <board
      material="flex"
      thickness={0.15}
      width={56}
      height={12}
      pcbX={22}
      solderMaskColor="#cc9b32"
      schematicDisabled
      autorouter="auto_local"
      outline={[
        ...arc(0, alpha, 2 * Math.PI - alpha),
        ...arc(pitch, Math.PI + alpha, 2 * Math.PI - alpha),
        ...arc(2 * pitch, Math.PI + alpha, 3 * Math.PI - alpha),
        ...arc(pitch, alpha, Math.PI - alpha),
      ]}
    >
      {[a, b, pitch + a, pitch + b].map((x, i) => (
        <pcbbend
          key={i}
          name={`B${i + 1}`}
          x1={x - pitch}
          y1={-neckHalfWidth}
          x2={x - pitch}
          y2={neckHalfWidth}
          bendAngle={i < 2 ? 90 : -90}
          bendRadius="1mm"
          bendSide="right"
        />
      ))}
      {[0, 1, 2].map((i) => (
        <group key={i} pcbX={(i - 1) * pitch}>
          <pcbstiffener
            name={`S${i + 1}`}
            shape="polygon"
            layer="bottom"
            material="fr4"
            thickness="0.2mm"
            adhesiveThickness="0.05mm"
            outline={Array.from({ length: 48 }, (_, j) => ({
              x: 5.5 * Math.cos((j * Math.PI) / 24),
              y: 5.5 * Math.sin((j * Math.PI) / 24),
            }))}
          />
          <silkscreentext
            text={`${i + 1}`}
            pcbY={-4.5}
            fontSize={1.4}
            anchorAlignment="center"
          />
        </group>
      ))}
      <net name="VCC" />
      <net name="GND" />
      {/* Solderable power contacts on the first disc. */}
      <chip
        name="J1"
        pcbX={-pitch}
        pcbY={0}
        pinLabels={{ pin1: "VCC", pin2: "GND" }}
        footprint={
          <footprint>
            <smtpad
              portHints={["pin1"]}
              pcbX={-1.5}
              width={1.5}
              height={2}
              shape="rect"
            />
            <smtpad
              portHints={["pin2"]}
              pcbX={1.5}
              width={1.5}
              height={2}
              shape="rect"
            />
          </footprint>
        }
        connections={{ VCC: "net.VCC", GND: "net.GND" }}
      />
      <silkscreentext
        text="VCC  GND"
        pcbX={-pitch}
        pcbY={2}
        fontSize={0.7}
        anchorAlignment="center"
      />
      <chip
        name="U1"
        footprint="soic8"
        pcbX={0}
        pcbY={0}
        pinLabels={{ pin1: "OUT", pin4: "GND", pin8: "VCC" }}
        connections={{ VCC: "net.VCC", GND: "net.GND", OUT: ".R1 > .pin1" }}
      />
      <resistor
        name="R1"
        footprint="0402"
        resistance="330"
        pcbX={0}
        pcbY={3.8}
        connections={{ pin2: ".LED1 > .anode" }}
      />
      <led
        name="LED1"
        footprint="0603"
        color="red"
        pcbX={pitch}
        pcbY={0}
        connections={{ cathode: "net.GND" }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson() as AnyCircuitElement[]
}

/** Right-click and choose Fold PCBs to stack the three circular areas. */
const Capsule = ({ inputFolded = false }: { inputFolded?: boolean }) => {
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[]>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let active = true
    createCircuit().then(
      (json) => {
        if (active)
          setCircuitJson(
            inputFolded
              ? transformCircuitJsonCadComponents(json, { foldPcbs: true })
              : json,
          )
      },
      (error: unknown) => {
        if (active)
          setError(error instanceof Error ? error.message : String(error))
      },
    )
    return () => {
      active = false
    }
  }, [inputFolded])

  if (error) return <div role="alert">Unable to generate flex PCB: {error}</div>
  if (!circuitJson) return <div role="status">Routing flex PCB…</div>
  return (
    <div style={{ width: "100%", height: "90vh" }}>
      <CadViewer circuitJson={circuitJson} autoRotateDisabled />
    </div>
  )
}

export const ThreeDiscCapsule = () => <Capsule />

/** The viewer starts flat even when the input CAD poses are already folded. */
export const PreFoldedCad = () => <Capsule inputFolded />
