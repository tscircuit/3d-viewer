import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <footprint>
        <silkscreentext
          text="bottom_L"
          pcbX={0}
          pcbY={0}
          anchorAlignment="bottom_left"
          pcbRotation={0}
          layer="top"
          fontSize={0.25}
        />
        <silkscreentext
          text="top_L"
          pcbX={0}
          pcbY={0}
          anchorAlignment="top_left"
          pcbRotation={0}
          layer="top"
          fontSize={0.25}
        />
        <silkscreentext
          text="bottom_R"
          pcbX={0}
          pcbY={0}
          anchorAlignment="bottom_right"
          pcbRotation={0}
          layer="top"
          fontSize={0.25}
        />
        <silkscreentext
          text="top_R"
          pcbX={0}
          pcbY={0}
          anchorAlignment="top_right"
          pcbRotation={0}
          layer="top"
          fontSize={0.25}
        />
        <silkscreentext
          text="center"
          pcbX={0}
          pcbY={1}
          anchorAlignment="center"
          pcbRotation={0}
          layer="bottom"
          fontSize={0.25}
        />
      </footprint>
    </board>,
  )

  return circuit.getCircuitJson()
}

export const SilkscreenText = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "Silkscreen Text",
  component: SilkscreenText,
}
