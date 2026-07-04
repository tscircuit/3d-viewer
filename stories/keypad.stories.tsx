import { CadViewer } from "src/CadViewer"
import keypad from "./assets/keypad.json"

const keypadTextureResolutionOptions = {
  maxTexturePixels: 16_000_000,
  maxTextureDimension: 8192,
} as const

export const Default = () => (
  <CadViewer
    circuitJson={keypad}
    textureResolution={60}
    textureResolutionOptions={keypadTextureResolutionOptions}
  />
)

export default {
  title: "Keypad",
  component: Default,
}
