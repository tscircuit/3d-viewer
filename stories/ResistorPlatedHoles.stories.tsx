import { CadViewer } from "src/CadViewer"

export const ResistorPlatedHoleShowcase = () => (
  <CadViewer>
    <board width="40mm" height="30mm">
      <resistor
        name="R1"
        footprint="0805"
        resistance="4.7k"
        pcbX={-10}
        pcbY={0}
        connections={{pin1:"R2.pin2"}}
      />
      <resistor
        name="R2"
        footprint="0805"
        resistance="4.7k"
        pcbX={10}
        pcbY={0}
      />
      <platedhole
        shape="circle"
        holeDiameter={1.2}
        outerDiameter={2.6}
        pcbX={-15}
        pcbY={10}
      />
      <platedhole
        shape="circular_hole_with_rect_pad"
        holeDiameter={1.2}
        rectPadWidth={3.4}
        rectPadHeight={2.6}
        pcbX={0}
        pcbY={10}
      />
      <platedhole
        shape="pill_hole_with_rect_pad"
        holeShape="pill"
        padShape="rect"
        holeWidth={1.2}
        holeHeight={2.6}
        rectPadWidth={3.6}
        rectPadHeight={3.2}
        pcbX={15}
        pcbY={10}
      />
    </board>
  </CadViewer>
)

export default {
  title: "Plated Holes/Resistor with Plated Holes",
  component: ResistorPlatedHoleShowcase,
}
