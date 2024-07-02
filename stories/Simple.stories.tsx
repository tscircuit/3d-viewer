import { fn } from "@storybook/test"
import { CadViewer } from "src/CadViewer"
import bugsPadsAndTracesSoup from "./assets/bug-pads-and-traces.json"

export const Default = () => <CadViewer soup={bugsPadsAndTracesSoup as any} />

export default {
  title: "Simple",
  component: Default,
}
