import { CadViewer } from "../src/CadViewer"
import glbUrl from "../tests/assets/prerendered-components.glb?url"

export default { title: "Prerendered GLB", component: CadViewer }

export const FromUrl = (args: { glbUrl?: string }) => (
  <div style={{ height: 600 }}>
    <CadViewer glbUrl={args.glbUrl ?? glbUrl} autoRotateDisabled />
  </div>
)
export const FailedLoad = () => <CadViewer glbUrl="/missing-prerendered.glb" />
