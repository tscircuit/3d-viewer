import { CadViewer } from "src/CadViewer"

/**
 * Test fixture for orthographic camera GLB color bug fix.
 *
 * Steps to test:
 * 1. Note the golden/brass color of the components
 * 2. Right-click to open context menu
 * 3. Check "Orthographic Camera"
 * 4. Verify colors remain the same (not darker)
 * 5. Uncheck "Orthographic Camera"
 * 6. Verify colors still remain consistent
 */
export const OrthographicCameraGlbColor = () => (
  <CadViewer>
    <board width="20mm" height="20mm">
      <chip
        name="U1"
        pcbX={-4}
        pcbY={4}
        cadModel={{
          glbUrl: "https://modelcdn.tscircuit.com/jscad_models/soic6.glb",
          rotationOffset: { x: 0, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0 },
        }}
        footprint="soic6"
      />
      <chip
        name="U2"
        pcbX={4}
        pcbY={4}
        cadModel={{
          glbUrl: "https://modelcdn.tscircuit.com/jscad_models/soic8.glb",
          rotationOffset: { x: 0, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0 },
        }}
        footprint="soic8"
      />
      <chip
        name="U3"
        pcbX={0}
        pcbY={-4}
        cadModel={{
          glbUrl: "https://modelcdn.tscircuit.com/jscad_models/qfp64.glb",
          rotationOffset: { x: 0, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0 },
        }}
        footprint="qfp64"
      />
    </board>
  </CadViewer>
)

OrthographicCameraGlbColor.storyName = "Orthographic Camera GLB Color"

export default {
  title: "Bugs/Orthographic Camera GLB Color",
}
