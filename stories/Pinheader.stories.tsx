import { CadViewer } from "src/CadViewer"

export const Pinheader = () => {
  return (
    <CadViewer>
      <board width={20} height={10}>
        <pinheader gender="male" pinCount={2} name="P1" pcbX={-4}/>
        <pinheader gender="female" pinCount={2} name="P2" pcbX={4} />
      </board>
    </CadViewer>
  )
}

export default {
  title: "Pinheader",
  component: Pinheader,
}
