import { CadViewer } from "src/CadViewer"
import stm32f746gDisco from "./assets/STM32F746G-DISCO.json"
import keypad from "./assets/keypad.json"

export const Default = () => <CadViewer circuitJson={keypad} />

export const Stm32f746gDisco = () => (
  <CadViewer circuitJson={stm32f746gDisco as any} />
)
export default {
  title: "Keypad",
  component: Default,
}
