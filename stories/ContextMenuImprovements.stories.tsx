import { CadViewer } from "../src/CadViewer"

export default {
  title: "Context Menu/Improvements Demo",
  component: CadViewer,
}

const simpleCircuit = {
  type: "circuit" as const,
  pcb_board: {
    type: "pcb_board" as const,
    pcb_board_id: "board1",
    width: 10,
    height: 10,
    center: { x: 0, y: 0 },
    outline: [
      { x: -5, y: -5 },
      { x: 5, y: -5 },
      { x: 5, y: 5 },
      { x: -5, y: 5 },
    ],
  },
  pcb_trace: [
    {
      type: "pcb_trace" as const,
      pcb_trace_id: "trace1",
      route: [
        { x: -2, y: -2, layer: "top" },
        { x: 2, y: 2, layer: "top" },
      ],
    },
  ],
}

export const ContextMenuDemo = () => (
  <div style={{ width: "100%", height: "600px" }}>
    <CadViewer circuitJson={simpleCircuit} />
  </div>
)

export const EdgePositioning = () => (
  <div
    style={{
      width: "100vw",
      height: "100vh",
      position: "fixed",
      top: 0,
      left: 0,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: "10px",
      padding: "10px",
      background: "#000",
    }}
  >
    <div style={{ border: "2px solid #333", borderRadius: "8px" }}>
      <CadViewer circuitJson={simpleCircuit} />
    </div>
    <div style={{ border: "2px solid #333", borderRadius: "8px" }}>
      <CadViewer circuitJson={simpleCircuit} />
    </div>
    <div style={{ border: "2px solid #333", borderRadius: "8px" }}>
      <CadViewer circuitJson={simpleCircuit} />
    </div>
    <div style={{ border: "2px solid #333", borderRadius: "8px" }}>
      <CadViewer circuitJson={simpleCircuit} />
    </div>
  </div>
)

EdgePositioning.parameters = {
  layout: "fullscreen",
  docs: {
    description: {
      story: `
## Edge Positioning Test

This story shows 4 viewers in a grid to test context menu positioning at screen edges.

**Try right-clicking**:
- Top-left viewer: Menu should open right and down
- Top-right viewer: Menu should open left and down  
- Bottom-left viewer: Menu should open right and up
- Bottom-right viewer: Menu should open left and up

The menu will automatically adjust to stay visible!
      `,
    },
  },
}
