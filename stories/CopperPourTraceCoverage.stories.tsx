import { CadViewer } from "src/CadViewer"
import differentNet from "./assets/copper-pour-different-net.json"
import sameNet from "./assets/copper-pour-same-net.json"
import sameNetFullyCovered from "./assets/copper-pour-same-net-trace-fully-covered.json"

export const DifferentNet = () => (
  <CadViewer circuitJson={differentNet as any} />
)

export const SameNet = () => <CadViewer circuitJson={sameNet as any} />

export const SameNetTraceFullyCovered = () => (
  <CadViewer circuitJson={sameNetFullyCovered as any} />
)

export default {
  title: "Copper Pour/Trace Coverage",
  component: DifferentNet,
}
