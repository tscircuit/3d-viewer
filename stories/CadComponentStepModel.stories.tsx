import "tscircuit"
import { CadViewer } from "src/CadViewer"
import stepModelUrl from "./assets/simple-box.step?url"

export const CadComponentStepModel = () => (
  <CadViewer>
    <board width="10mm" height="10mm">
      <chip
        name="U1"
        footprint="soic8"
        cadModel={
          <cadassembly>
            <cadmodel modelUrl={stepModelUrl} />
          </cadassembly>
        }
      />
    </board>
  </CadViewer>
)

CadComponentStepModel.storyName = "CAD Component STEP Model"

export default {
  title: "CadComponent/StepModel",
}
