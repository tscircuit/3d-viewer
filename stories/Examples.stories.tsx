import { fn } from "@storybook/test"
import { CadViewer } from "src/CadViewer"
import circuit from "../tests/assets/circuit.json"

export const Default = () => <CadViewer soup={circuit as any} />

export default {
  title: "Board with resistor",
  component: Default,
}