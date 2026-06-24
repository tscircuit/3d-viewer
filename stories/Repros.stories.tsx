import { CadViewer } from "src/CadViewer"
import SilkscreenText from "./assets/silkscreen-text-size.json"

export const SilkScreenTextSize = () => (
  <CadViewer circuitJson={SilkscreenText as any} />
)

export default {
  title: "Repros",
  component: SilkScreenTextSize,
}
