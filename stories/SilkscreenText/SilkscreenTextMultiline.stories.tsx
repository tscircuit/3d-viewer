import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="30mm" height="30mm">
      <footprint>
        {/* Multi-line text centered */}
        <silkscreentext
          text="Line1\nLine2\nLine3"
          pcbX={0}
          pcbY={5}
          anchorAlignment="center"
          pcbRotation={0}
          layer="top"
          fontSize={1.3}
        />

        {/* Multi-line text top-left */}
        <silkscreentext
          text="Top\nLeft"
          pcbX={-8}
          pcbY={-5}
          anchorAlignment="top_left"
          pcbRotation={0}
          layer="top"
          fontSize={1.25}
        />

        {/* Multi-line text bottom-right */}
        <silkscreentext
          text="Bottom\nRight"
          pcbX={8}
          pcbY={5}
          anchorAlignment="bottom_right"
          pcbRotation={0}
          layer="top"
          fontSize={1.25}
        />

        {/* Multi-line text on bottom layer */}
        <silkscreentext
          text="Bottom\nLayer\nText"
          pcbX={0}
          pcbY={-5}
          anchorAlignment="center"
          pcbRotation={0}
          layer="bottom"
          fontSize={1.25}
        />

        {/* Multi-line text with rotation */}
        <silkscreentext
          text="Rotated\nText"
          pcbX={0}
          pcbY={0}
          anchorAlignment="center"
          pcbRotation={45}
          layer="top"
          fontSize={1.25}
        />
      </footprint>
    </board>,
  )

  return circuit.getCircuitJson()
}

export const SilkscreenTextMultiline = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "Silkscreen Text",
  component: SilkscreenTextMultiline,
}
