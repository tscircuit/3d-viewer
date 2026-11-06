import { CadViewer } from "../src/CadViewer"
import { explosionAssembly } from "./fixtures/explosion-assembly"

export const StagedTsx = () => (
  <CadViewer autoRotateDisabled>{explosionAssembly}</CadViewer>
)

export default { title: "Assembly/Explosion", component: StagedTsx }
