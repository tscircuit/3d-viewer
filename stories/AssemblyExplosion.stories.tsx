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

import gameboyAdvanceJson from "./fixtures/gameboy-advance-dual-assembly/assembled.circuit.json?raw"
import type { CameraController } from "../src/hooks/cameraAnimation"
const gameboyAdvance = JSON.parse(gameboyAdvanceJson) as AnyCircuitElement[]
const frameGameboyAdvance = (controller: CameraController | null) =>
  controller?.animateTo({
    position: [-110, -70.01, 600],
    target: [-110, -70, 0],
    durationMs: 0,
  })

export const GameboyAdvanceDualRp2350 = () => (
  <CadViewer
    circuitJson={gameboyAdvance}
    autoRotateDisabled
    onCameraControllerReady={frameGameboyAdvance}
  />
)
