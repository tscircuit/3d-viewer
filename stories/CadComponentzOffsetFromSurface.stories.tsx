import "tscircuit"
import { CadViewer } from "src/CadViewer"

export const CadComponentzOffsetFromSurface = () => (
  <CadViewer>
    <board>
      <chip
        name="U1"
        footprint="soic8"
        cadModel={
          <cadmodel
            zOffsetFromSurface="2mm"
            modelUrl="https://modelcdn.tscircuit.com/jscad_models/soic8.glb"
          />
        }
      />
    </board>
  </CadViewer>
)

CadComponentzOffsetFromSurface.storyName = "CAD Component zOffsetFromSurface"

export default {
  title: "CadComponent/zOffsetFromSurface",
}
