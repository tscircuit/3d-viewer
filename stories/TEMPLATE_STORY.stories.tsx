import { CadViewer } from "src/CadViewer"

export const Default = () => (
  <CadViewer>
    <board width="10mm" height="10mm">
      <bug
        footprint="soic8"
        name="U1"
        cadModel={{
          jscad: {
            type: "cube",
            size: 5,
          },
        }}
      />
    </board>
  </CadViewer>
)

export default {
  title: "TEMPLATE_STORY",
  component: Default,
}
