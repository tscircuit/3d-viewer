import { CadViewer } from "src/CadViewer"
import mediumMachinePinUrl from "./assets/MediumMachinePin v2.glb?url"

export const MediumMachinePinV2 = () => {
  return (
    <CadViewer>
      <board width="10mm" height="10mm">
        <chip
          name="MediumMachinePin"
          footprint={
            <footprint>
              <hole diameter="1.5mm" pcbX={0} pcbY={0} />
            </footprint>
          }
          cadModel={{
            gltfUrl: mediumMachinePinUrl,
            rotationOffset: { x: 0, y: 0, z: 0 },
            positionOffset: { x: 0, y: 0, z: 0.8 },
            modelUnitToMmScale: 1000,
          }}
        />
      </board>
    </CadViewer>
  )
}
MediumMachinePinV2.storyName = "Medium Machine Pin v2"

export default {
  title: "Models/MediumMachinePin",
}
