import { CadViewer } from "src/CadViewer"

export const PlatedHoleOffset = () => {
  return (
    <CadViewer>
      <board width={20} height={20}>
        <platedhole
          shape="circular_hole_with_rect_pad"
          holeDiameter={2}
          rectPadWidth={4}
          rectPadHeight={4}
          holeOffsetX={1}
          holeOffsetY={-0.5}
        />
        <platedhole
          shape="pill_hole_with_rect_pad"
          holeShape="pill"
          padShape="rect"
          holeWidth={2}
          holeHeight={3}
          rectPadWidth={4}
          rectPadHeight={5}
          holeOffsetX={-0.75}
          holeOffsetY={0.5}
          pcbX={5.5}
          pcbY={4.5}
        />
        <platedhole
          shape="circular_hole_with_rect_pad"
          holeDiameter={2}
          rectPadWidth={4}
          rectPadHeight={4}
          pcbX={-10}
          holeOffsetX={0.5}
        />
        <platedhole
          shape="pill_hole_with_rect_pad"
          holeShape="pill"
          padShape="rect"
          holeWidth={2}
          holeHeight={3}
          rectPadWidth={4}
          rectPadHeight={5}
          holeOffsetX={-0.75}
          pcbX={10}
          pcbY={-4.5}
        />
      </board>
    </CadViewer>
  )
}

export default {
  title: "Plated Hole Offset",
  component: PlatedHoleOffset,
}
