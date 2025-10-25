import { CadViewer } from "src/CadViewer"

export const ResistorPlatedHoleShowcase = () => (
  <CadViewer>
    <board width="40mm" height="30mm">
       <resistor
        name="R1"
        footprint="0805"
        resistance="10k"
        pcbX={10}
        pcbY={0}
      />
      <resistor
        name="R2"
        footprint="0805"
        resistance="10k"
        pcbX={-10}
        pcbY={0}
      />
      <resistor
        name="R3"
        footprint="0805"
        resistance="10k"
        pcbX={0}
        pcbY={-10}
      />
      <resistor
        name="R4"
        footprint="0805"
        resistance="10k"
        pcbX={0}
        pcbY={10}
      />
      <trace from={".R1 > .pin1"} to={".R2 > .pin2"} />
      <trace from={".R4 > .pin1"} to={".R3 > .pin2"} />
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
