import { CadViewer } from "src/CadViewer"
import beaglePlayGlbUrl from "../assets/prerendered-glb/beagleplay.glb?url"

export const BeaglePlayCameraPresets = () => (
  <CadViewer glbUrl={beaglePlayGlbUrl} autoRotateDisabled />
)

export default {
  title: "Bugs/BeaglePlay GLB Camera Presets",
  component: BeaglePlayCameraPresets,
}
