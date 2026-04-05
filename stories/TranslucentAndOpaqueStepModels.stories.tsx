import { CadViewer } from "src/CadViewer"
import stepModelUrl from "./assets/MachineContactMedium.step?url"

export const TranslucentAndOpaqueStepModels = () => (
  <CadViewer>
    <board width="8mm" height="4mm" thickness={0.5}>
      <chip
        name="U1"
        footprint="pinrow1"
        pcbX={-2.3}
        pcbY={0}
        cadModel={
          <cadassembly>
            <cadmodel
              modelUrl={stepModelUrl}
              rotationOffset={{ x: 180, y: 0, z: 0 }}
            />
          </cadassembly>
        }
      />
      <chip
        name="U2"
        footprint="pinrow1"
        pcbX={2.3}
        pcbY={0}
        showAsTranslucentModel
        cadModel={
          <cadassembly>
            <cadmodel
              modelUrl={stepModelUrl}
              rotationOffset={{ x: 180, y: 0, z: 0 }}
            />
          </cadassembly>
        }
      />
      <silkscreentext
        text="Opaque STEP"
        pcbX={-2.2}
        pcbY={-1.5}
        fontSize={0.3}
      />
      <silkscreentext
        text="Translucent STEP"
        pcbX={2}
        pcbY={-1.5}
        fontSize={0.3}
      />
    </board>
  </CadViewer>
)

TranslucentAndOpaqueStepModels.storyName = "Translucent vs Opaque STEP Models"

export default {
  title: "Translucent/STEP Models",
}
