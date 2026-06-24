import "tscircuit"
import { CadViewer } from "src/CadViewer"
import myGlbUrl from "./assets/myGlb.glb?url"

export const CadComponentGlbAssembly = () => (
  <CadViewer>
    <board width="10mm" height="10mm">
      <chip
        name="U1"
        footprint="soic8"
        cadModel={
          <cadassembly>
            <cadmodel modelUrl={myGlbUrl} />
          </cadassembly>
        }
      />
    </board>
  </CadViewer>
)

CadComponentGlbAssembly.storyName = "CAD Component GLB Assembly"

export default {
  title: "CadComponent/GlbModel",
}
