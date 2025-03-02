import { CadViewer } from "src/CadViewer"

export const AtariBoardOutline = () => {
  return (
    <CadViewer>
      <board
        outline={[
          { x: -22.5, y: 24.5 },
          { x: 22.5, y: 24.5 },
          { x: 22.5, y: 16.5 },
          { x: 20.5, y: 16.5 },
          { x: 20.5, y: 12.5 },
          { x: 22.5, y: 12.5 },
          { x: 22.5, y: 2.5 },
          { x: 18, y: -1.5 },
          { x: 18, y: -18 },
          { x: -18, y: -18 },
          { x: -18, y: -1.5 },
          { x: -22.5, y: 2.5 },
          { x: -22.5, y: 12.5 },
          { x: -20.5, y: 12.5 },
          { x: -20.5, y: 16.5 },
          { x: -22.5, y: 16.5 },
          { x: -22.5, y: 24.5 },
        ]}
      >
        <resistor
          name="R1"
          footprint={"0402"}
          resistance={"1k"}
          pcbX={5}
          pcbY={2}
        />
        <resistor
          name="R2"
          footprint={"0402"}
          resistance={"1k"}
          pcbX={5}
          pcbY={0}
        />
        <trace from={".R1 > .right"} to={".R2 > .left"} />
      </board>
    </CadViewer>
  )
}

export const AtariBoardOutlineOffset = () => {
  return (
    <CadViewer>
      <board
        outline={[
          { x: -22.5, y: 24.5 },
          { x: 22.5, y: 24.5 },
          { x: 22.5, y: 16.5 },
          { x: 20.5, y: 16.5 },
          { x: 20.5, y: 12.5 },
          { x: 22.5, y: 12.5 },
          { x: 22.5, y: 2.5 },
          { x: 18, y: -1.5 },
          { x: 18, y: -18 },
          { x: -18, y: -18 },
          { x: -18, y: -1.5 },
          { x: -22.5, y: 2.5 },
          { x: -22.5, y: 12.5 },
          { x: -20.5, y: 12.5 },
          { x: -20.5, y: 16.5 },
          { x: -22.5, y: 16.5 },
          { x: -22.5, y: 24.5 },
        ]}
        outlineOffsetX={12}
        outlineOffsetY={-5}
      >
        <resistor
          name="R1"
          footprint={"0402"}
          resistance={"1k"}
          pcbX={5}
          pcbY={2}
        />
        <resistor
          name="R2"
          footprint={"0402"}
          resistance={"1k"}
          pcbX={5}
          pcbY={0}
        />
        <trace from={".R1 > .right"} to={".R2 > .left"} />
      </board>
    </CadViewer>
  )
}

export const AtariBoardWidthHeight = () => {
  return (
    <CadViewer>
      <board
        width="10mm"
        height="10mm"
      >
        <resistor
          name="R1"
          footprint={"0402"}
          resistance={"1k"}
          pcbX={5}
          pcbY={2}
        />
        <resistor
          name="R2"
          footprint={"0402"}
          resistance={"1k"}
          pcbX={5}
          pcbY={0}
        />
        <trace from={".R1 > .right"} to={".R2 > .left"} />
      </board>
    </CadViewer>
  )
}

export default {
  title: "BoardOutlineOffset",
  component: AtariBoardOutline,
}
