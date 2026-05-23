import { CadViewer } from "src/CadViewer"

export const MaleAndFemalePinrow2Rows = () => {
  return (
    <CadViewer>
      <board width="20mm" height="20mm">
        <jumper pcbY="4" pcbX="0" name="U1" footprint="pinrow6_rows2" />
        <jumper pcbY="-4" pcbX="0" name="U2" footprint="pinrow6_rows2_female" />
      </board>
    </CadViewer>
  )
}

MaleAndFemalePinrow2Rows.storyName = "Male and Female Pinrow 2 Rows"

export default {
  title: "Bugs/Pinrow 2 Rows Alignment",
}
