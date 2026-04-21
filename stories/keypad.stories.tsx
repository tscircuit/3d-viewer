import { CadViewer } from "src/CadViewer"
import keypad from "./assets/keypad.json"

export const Default = () => <CadViewer circuitJson={keypad} />

export default {
  title: "Keypad",
  component: Default,
}
