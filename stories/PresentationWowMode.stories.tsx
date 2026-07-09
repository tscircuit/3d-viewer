import { CadViewer } from "src/CadViewer"
import nineKeyKeyboard from "./assets/nine-key-keyboard.json"

export const KeyboardHero = () => (
  <CadViewer
    circuitJson={nineKeyKeyboard as any}
    visualStyle="presentation"
    cameraPreset="Hero"
    background="studio"
    showCallouts
    callouts={[
      {
        target: "U1",
        title: "High Fidelity",
        body: "Rendered from the real Circuit JSON and CAD model data",
      },
      {
        target: "K1_shaft",
        title: "Layer Awareness",
        body: "Soldermask, copper, pads, and silkscreen stay data-backed",
        labelOffset: { x: 80, y: -84 },
      },
      {
        position: [20, -32, 3.2],
        title: "Hero Camera",
        body: "Studio lighting, shadows, and a lower product-shot angle",
        labelOffset: { x: -230, y: 58 },
      },
    ]}
  />
)

export default {
  title: "Presentation/Wow Mode",
  component: KeyboardHero,
}
