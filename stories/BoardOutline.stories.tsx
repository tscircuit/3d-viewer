import { CadViewer } from "src/CadViewer"

function CustomBoard({ boardOutline }) {
  return (
    <board width="10mm" height="10mm" outline={boardOutline} outlineOffsetX={-10} outlineOffsetY={15}>
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
  )
}

export const AtariBoardOutline = () => {
  return (
    <CadViewer>
      <CustomBoard
        boardOutline={[
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
      />
    </CadViewer>
  )
}

export const StarBoardOutline = () => {
  return (
    <CadViewer>
      <CustomBoard
        boardOutline={[
          { x: 0, y: 25 },
          { x: 5, y: 15 },
          { x: 15, y: 12.5 },
          { x: 8.5, y: 5 },
          { x: 10, y: -7.5 },
          { x: 0, y: -2.5 },
          { x: -10, y: -7.5 },
          { x: -8.5, y: 5 },
          { x: -15, y: 12.5 },
          { x: -5, y: 15 },
        ]}
      />
    </CadViewer>
  )
}

export default {
  title: "BoardOutline",
  component: AtariBoardOutline,
}
