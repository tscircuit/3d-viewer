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

export const Dip8 = () => (
  <CadViewer>
    <board width="50mm" height="50mm">
      <chip name="U1" footprint="dip8" />
    </board>
  </CadViewer>
)

export default {
  title: "CadComponentWithJscadPlan",
  component: Default,
}
