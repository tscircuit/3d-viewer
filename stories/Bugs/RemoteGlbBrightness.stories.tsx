import { CadViewer } from "src/CadViewer"

export const RemoteSoic6Glb = () => (
  <CadViewer>
    <board width="10mm" height="10mm">
      <chip
        name="Remote SOIC-6"
        cadModel={{
          glbUrl: "https://modelcdn.tscircuit.com/jscad_models/soic6.glb",
          rotationOffset: { x: 0, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0 },
        }}
        footprint="soic6"
      />
    </board>
  </CadViewer>
)

RemoteSoic6Glb.storyName = "Remote SOIC-6 GLB"

export default {
  title: "Bugs/Remote GLB Brightness",
}
