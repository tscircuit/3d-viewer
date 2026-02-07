import { CadViewer } from "src/CadViewer"
import myGlb from "./assets/myGlb.glb?url"

export const ResolveStaticAssetForModelUrls = () => {
  return (
    <CadViewer
      resolveStaticAsset={(modelUrl) => {
        if (modelUrl === "@assets/myGlb.glb") {
          return myGlb
        }
        return modelUrl
      }}
    >
      <board width="5mm" height="5mm">
        <chip
          name="ResolvedGlb"
          footprint={
            <footprint>
              <hole diameter="0.9mm" pcbX={0} pcbY={0} />
            </footprint>
          }
          cadModel={{
            gltfUrl: "@assets/myGlb.glb",
            rotationOffset: { x: 90, y: 0, z: 0 },
            positionOffset: { x: 0, y: 0, z: 0.6 },
          }}
        />
      </board>
    </CadViewer>
  )
}

ResolveStaticAssetForModelUrls.storyName = "Resolve Static Asset"

export default {
  title: "Models/Resolve Static Asset",
}
