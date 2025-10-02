import { CadViewer } from "src/CadViewer"

export const RemoteSoic6Glb = () => (
  <div style={{ width: 640, height: 480 }}>
    <CadViewer>
      <board width="10mm" height="10mm">
        <chip
          name="Remote SOIC-6"
          cadModel={{
            glbUrl: "https://modelcdn.tscircuit.com/jscad_models/soic6.glb",
            rotationOffset: { x: 90, y: 0, z: 0 },
            positionOffset: { x: 0, y: 0, z: 0.6 },
          }}
          footprint={
            <footprint>
              <hole diameter="0.9mm" pcbX={0} pcbY={0} />
            </footprint>
          }
        />
      </board>
    </CadViewer>
  </div>
)

RemoteSoic6Glb.storyName = "Remote SOIC-6 GLB"

export default {
  title: "Bugs/Remote GLB Brightness",
}
