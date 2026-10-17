import { CadViewer } from "src/CadViewer"

export const Default = () => (
  <CadViewer autoRotateDisabled>
    <board width="24mm" height="18mm">
      <chip
        name="U1"
        footprint="soic8"
        cadModel={{ jscad: { type: "cuboid", size: [5, 4, 3] } }}
      />
      <resistor
        name="R1"
        resistance="10k"
        footprint="0805"
        pcbX={-7}
        cadModel={{ jscad: { type: "cuboid", size: [2, 1.25, 0.5] } }}
      />
    </board>
  </CadViewer>
)

export default {
  title: "Wireframe",
  component: Default,
  parameters: {
    docs: {
      description: {
        story:
          "Right-click the viewer and select Appearance → Wireframe. Toggle it off to restore solid rendering, or switch engines while enabled to check the rebuilt meshes.",
      },
    },
  },
}
