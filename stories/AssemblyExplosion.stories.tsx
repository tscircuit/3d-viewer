import type { AnyCircuitElement } from "circuit-json"
import flex17Json from "./fixtures/flex17-spur.json?raw"
const flex17 = JSON.parse(flex17Json) as AnyCircuitElement[]
import { CadViewer } from "../src/CadViewer"
import { explosionAssembly } from "./fixtures/explosion-assembly"

export const StagedTsx = () => (
  <CadViewer autoRotateDisabled>{explosionAssembly}</CadViewer>
)

export default { title: "Assembly/Explosion", component: StagedTsx }

// Source: https://flex17-tsx-adjustable-spur.seveibar.chatgpt.site/
// Self-contained geometry and authored stages; no authenticated asset requests.
export const Flex17AdjustableSpur = () => (
  <CadViewer autoRotateDisabled circuitJson={flex17 as AnyCircuitElement[]} />
)
