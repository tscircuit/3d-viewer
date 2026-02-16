import React from "react"
import "tscircuit"
import { CadViewer } from "src/CadViewer"
import myGlbUrl from "./assets/myGlb.glb?url"

export const TranslucentGlbSingleModel = () => (
  <CadViewer>
    <board width="10mm" height="10mm">
      <chip
        name="U1"
        footprint="soic8"
        pcbX={0}
        pcbY={0}
        showAsTranslucentModel
        cadModel={{
          gltfUrl: myGlbUrl,
          rotationOffset: { x: 90, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0.6 },
        }}
      />
    </board>
  </CadViewer>
)
TranslucentGlbSingleModel.storyName = "Single Translucent GLB Model"

export const TranslucentAndOpaqueGlbModels = () => (
  <CadViewer>
    <board width="20mm" height="20mm">
      {/* Opaque GLB model */}
      <chip
        name="U1"
        footprint="soic8"
        pcbX={-5}
        pcbY={0}
        cadModel={{
          gltfUrl: myGlbUrl,
          rotationOffset: { x: 90, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0.6 },
        }}
      />

      {/* Translucent GLB model */}
      <chip
        name="U2"
        footprint="soic8"
        pcbX={5}
        pcbY={0}
        showAsTranslucentModel
        cadModel={{
          gltfUrl: myGlbUrl,
          rotationOffset: { x: 90, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0.6 },
        }}
      />
    </board>
  </CadViewer>
)
TranslucentAndOpaqueGlbModels.storyName = "Translucent vs Opaque GLB Models"

export const TranslucentGlbWithCadAssembly = () => (
  <CadViewer>
    <board width="10mm" height="10mm">
      <chip
        name="U1"
        footprint="soic8"
        showAsTranslucentModel
        cadModel={
          <cadassembly>
            <cadmodel modelUrl={myGlbUrl} />
          </cadassembly>
        }
      />
    </board>
  </CadViewer>
)
TranslucentGlbWithCadAssembly.storyName = "Translucent GLB with CAD Assembly"

export const InnerTranslucentGlbModel = () => (
  <CadViewer>
    <board width="10mm" height="10mm">
      <chip
        name="U1"
        footprint="soic8"
        cadModel={
          <cadassembly>
            <cadmodel showAsTranslucentModel modelUrl={myGlbUrl} />
          </cadassembly>
        }
      />
    </board>
  </CadViewer>
)
InnerTranslucentGlbModel.storyName = "Inner Translucent GLB Model"

export default {
  title: "Translucent/GLB Models",
}
