import { CadViewer } from "src/CadViewer"

export const boardWithEdgePlatedHole = () => (
  <CadViewer>
    <board width="20mm" height="20mm">
      <platedhole
        shape="circle"
        pcbX={10}
        pcbY={0}
        holeDiameter={2}
        outerDiameter={5}
      />
      <platedhole
        shape="circle"
        pcbX={-10}
        pcbY={0}
        holeDiameter={1}
        outerDiameter={3}
      />
      <platedhole
        shape="circle"
        pcbX={0}
        pcbY={10}
        holeDiameter={2}
        outerDiameter={3}
      />
      <platedhole
        shape="circle"
        pcbX={0}
        pcbY={-10}
        holeDiameter={2}
        outerDiameter={3}
      />
    </board>
  </CadViewer>
)
boardWithEdgePlatedHole.storyName = "Board with Edge Plated Hole"
export default {
  title: "Bugs/Plated Hole Edge Cutout",
}
