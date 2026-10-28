import type { CadComponent } from "circuit-json"
import { CadViewer } from "src/CadViewer"
import type { CameraController } from "src/hooks/cameraAnimation"
import phoneHolderUrl from "./assets/gimbal-phone-holder.stl?url"

const phoneHolder: CadComponent = {
  type: "cad_component",
  cad_component_id: "gimbal_phone_holder",
  source_component_id: "phone_holder",
  model_stl_url: phoneHolderUrl,
  position: { x: -80.5, y: 42, z: 144 },
  anchor_alignment: "center",
  model_object_fit: "contain_within_bounds",
}

const showHolder = (controller: CameraController | null) => {
  controller?.animateTo({
    position: [280, -330, 250],
    target: [0, 0, 72],
    durationMs: 0,
  })
}

export const GimbalPhoneHolderStl = () => (
  <CadViewer
    circuitJson={[phoneHolder]}
    autoRotateDisabled
    onCameraControllerReady={showHolder}
  />
)

export default {
  title: "Assembly/Gimbal Phone Holder STL",
  component: GimbalPhoneHolderStl,
}
