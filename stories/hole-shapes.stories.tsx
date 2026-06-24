import { CadViewer } from "../src/CadViewer"

export const CirclePillRectHoles = () => {
  return (
    <CadViewer>
      <board width="12mm" height="12mm">
        <hole shape="circle" diameter="1.2mm" pcbX={-3} pcbY={2} />
        <hole shape="pill" width="5mm" height="2mm" pcbX={3} pcbY={2} />
        <hole shape="rect" width="5mm" height="2mm" pcbX={0} pcbY={-2} />
      </board>
    </CadViewer>
  )
}

CirclePillRectHoles.storyName = "Circle, Pill, Rect Holes"

export default {
  title: "PCB/Hole Shapes",
}
