import { CadViewer } from "src/CadViewer"

export const Pinheader = () => {
  return (
    <CadViewer>
      <board>
        <pinheader gender="female" pinCount={2} name="P1" />
      </board>
    </CadViewer>
  )
}

export default {
  title: "Pinheader",
  component: Pinheader,
}
