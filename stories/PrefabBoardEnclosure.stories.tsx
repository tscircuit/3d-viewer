import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "src/CadViewer"
import prefabBoardWithEnclosure from "./assets/prefab-board-with-enclosure.json"

/**
 * Full prefab-board acceptance fixture using the staged single-enclosure Circuit
 * JSON representation. The source board/components are static output from Core's
 * enclosure fixture; only the enclosure records were lowered to the current
 * synthetic source/PCB/CAD compatibility triple.
 *
 * Use Appearance → Enclosure to cycle the assembled case through translucent,
 * opaque and hidden while checking its openings against the enclosed parts.
 */
const circuitJson = prefabBoardWithEnclosure as unknown as AnyCircuitElement[]

export const PrefabBoardEnclosure = () => (
  <CadViewer circuitJson={circuitJson} />
)

export default {
  title: "Enclosures/Prefab Board",
  component: PrefabBoardEnclosure,
}
