import { Circuit, assembly } from "@tscircuit/core"
import {
  createSheetMetalMesh,
  createHexSocketBoltMesh,
  type SheetMetalMesh,
} from "modelprinter"

/** OBJ preserves modelprinter's right-handed, millimeter, +Z-up frame. */
function meshToObjUrl(mesh: SheetMetalMesh): string {
  const lines: string[] = []
  for (let i = 0; i < mesh.positions.length; i += 3)
    lines.push(
      `v ${mesh.positions[i]} ${mesh.positions[i + 1]} ${mesh.positions[i + 2]}`,
    )
  for (let i = 0; i < mesh.indices.length; i += 3)
    lines.push(
      `f ${mesh.indices[i]! + 1} ${mesh.indices[i + 1]! + 1} ${mesh.indices[i + 2]! + 1}`,
    )
  return `data:text/plain;charset=utf-8,${encodeURIComponent(lines.join("\n"))}`
}

export const sheetMetalAssemblyDimensions = {
  baseLength: 24,
  width: 28,
  flangeHeight: 14,
  thickness: 1,
  insideBendRadius: 2,
}
export const enclosureMesh = createSheetMetalMesh({
  profile: "channel",
  ...sheetMetalAssemblyDimensions,
  holes: [
    { panel: "base", shape: "round", diameter: 3.2, u: -8, v: -9 },
    { panel: "base", shape: "round", diameter: 3.2, u: 8, v: 9 },
    { panel: "left", shape: "slot", length: 18, width: 4, u: 2, v: 0 },
    { panel: "right", shape: "slot", length: 18, width: 4, u: 2, v: 0 },
  ],
})
const enclosureUrl = meshToObjUrl(enclosureMesh)
const boltUrl = meshToObjUrl(
  createHexSocketBoltMesh({ metricSize: "M3", length: 6 }),
)
const bendRadius = 2
const quarterArc = (Math.PI * bendRadius) / 2
// Inside flex riser X=12.5, top Z=17, outside riser X=18.5. The
// channel's right wall spans X=14..15 and ends at Z=14.5.
const firstBend = 10.5 + quarterArc / 2
const bends = [
  firstBend,
  firstBend + 13 + quarterArc,
  firstBend + 15 + 2 * quarterArc,
  firstBend + 28 + 3 * quarterArc,
]
const endX = bends[3]! + quarterArc / 2 + 12
const centerX = (endX - 8) / 2
export const sheetMetalFlexBends = bends

export async function createSheetMetalFlexAssembly() {
  const circuit = new Circuit()
  circuit.add(
    <assembly.device name="flex_controller">
      <assembly.subassembly
        name="slotted_channel"
        cadModel={{
          objUrl: enclosureUrl,
          modelBoardNormalDirection: "z+",
          positionOffset: { x: 0, y: 0, z: -2 },
        }}
      />
      {[
        [-8, -9],
        [8, 9],
      ].map(([x, y], i) => (
        <assembly.subassembly
          key={i}
          name={`mounting_bolt_${i + 1}`}
          cadModel={{
            objUrl: boltUrl,
            modelBoardNormalDirection: "z+",
            positionOffset: { x: x!, y: y!, z: -1.5 },
          }}
        />
      ))}
      <board
        name="wraparound_flex"
        width={endX + 8}
        height={14}
        pcbX={centerX}
        material="flex"
        thickness={0.15}
        solderMaskColor="#c68d25"
        schematicDisabled
        autorouter="auto_local"
        outline={[
          { x: -8, y: -7 },
          { x: 7, y: -7 },
          { x: 7, y: -3 },
          { x: endX - 12, y: -3 },
          { x: endX - 12, y: -7 },
          { x: endX, y: -7 },
          { x: endX, y: 7 },
          { x: endX - 12, y: 7 },
          { x: endX - 12, y: 3 },
          { x: 7, y: 3 },
          { x: 7, y: 7 },
          { x: -8, y: 7 },
        ]}
      >
        {bends.map((x, i) => (
          <pcbbend
            key={i}
            name={`B${i + 1}`}
            x1={x - centerX}
            y1={-3}
            x2={x - centerX}
            y2={3}
            bendAngle={i === 0 || i === 3 ? 90 : -90}
            bendRadius={bendRadius}
            bendSide="right"
          />
        ))}
        <pcbstiffener
          shape="rect"
          name="controller_backer"
          pcbX={-centerX}
          width={13}
          height={12}
          thickness={0.4}
          adhesiveThickness={0.05}
          layer="bottom"
          material="fr4"
        />
        <pcbstiffener
          shape="rect"
          name="connector_backer"
          pcbX={endX - 6 - centerX}
          width={10}
          height={12}
          thickness={0.4}
          adhesiveThickness={0.05}
          layer="bottom"
          material="fr4"
        />
        <net name="VCC" />
        <net name="GND" />
        <chip
          name="U1"
          footprint="soic8"
          pcbX={-centerX}
          pinLabels={{ pin1: "OUT", pin4: "GND", pin8: "VCC" }}
          connections={{ VCC: "net.VCC", GND: "net.GND", OUT: ".R1 > .pin1" }}
        />
        <resistor
          name="R1"
          footprint="0402"
          resistance="330"
          pcbX={3 - centerX}
          pcbY={4.5}
          connections={{ pin2: ".LED1 > .anode" }}
        />
        <led
          name="LED1"
          footprint="0603"
          color="red"
          pcbX={(bends[2]! + bends[3]!) / 2 - centerX}
          connections={{ cathode: "net.GND" }}
        />
        <chip
          name="J1"
          pcbX={endX - 6 - centerX}
          pinLabels={{ pin1: "VCC", pin2: "GND" }}
          connections={{ VCC: "net.VCC", GND: "net.GND" }}
          footprint={
            <footprint>
              <smtpad
                portHints={["pin1"]}
                pcbX={-1.5}
                width={1.8}
                height={2.5}
                shape="rect"
              />
              <smtpad
                portHints={["pin2"]}
                pcbX={1.5}
                width={1.8}
                height={2.5}
                shape="rect"
              />
            </footprint>
          }
        />
        <silkscreentext
          text="CTRL"
          pcbX={-centerX}
          pcbY={-5.5}
          fontSize={0.8}
        />
        <silkscreentext
          text="3V3 GND"
          pcbX={endX - 6 - centerX}
          pcbY={4.5}
          fontSize={0.8}
        />
      </board>
    </assembly.device>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
