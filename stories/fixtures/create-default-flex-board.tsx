import { Circuit } from "@tscircuit/core"

/** No custom mask color: exercise the material's default amber/copper palette. */
export async function createDefaultFlexBoard() {
  const circuit = new Circuit()
  circuit.add(
    <board
      material="flex"
      width={24}
      height={12}
      thickness={0.2}
      schematicDisabled
    >
      <resistor name="R1" resistance="1k" footprint="0402" pcbX={-7} />
      <resistor name="R2" resistance="1k" footprint="0402" pcbX={7} />
      <trace from=".R1 > .pin2" to=".R2 > .pin1" thickness={0.5} />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
