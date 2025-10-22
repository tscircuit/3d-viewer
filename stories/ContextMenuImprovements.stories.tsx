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

ContextMenuDemo.parameters = {
  docs: {
    description: {
      story: `
## Context Menu Improvements

The context menu has been upgraded with the following features:

### 🎯 Smart Positioning
- **Viewport-aware**: Automatically adjusts position to stay on screen
- **Edge detection**: Opens to the left when near right edge, upward when near bottom
- **Submenu intelligence**: Submenus reposition themselves to remain visible

### 🎨 Conventional Design
- **Standard hover effect**: Blue highlight (#0078d4) instead of custom dark gray
- **Professional styling**: Rounded corners, proper shadows, smooth animations
- **Consistent spacing**: 32px item height, proper padding and gaps

### ♿ Accessibility
- **Keyboard navigation**: Arrow keys to navigate, Enter to select, Escape to close
- **Screen reader friendly**: Proper ARIA labels and roles
- **Focus management**: Clear focus indicators

### 📱 Touch Support
- **Long press**: Works on mobile devices
- **Proper touch targets**: Adequate spacing for finger taps

## Try It Out
1. **Right-click anywhere** on the 3D viewer
2. **Test edge cases**: Right-click near the edges of the screen
3. **Explore submenus**: Hover over "Camera Position" or "Appearance"
4. **Keyboard**: Tab to focus, use arrow keys, press Enter

## Technical Details
Powered by **@radix-ui/react-context-menu** - a production-ready, accessible component library.
      `,
    },
  },
}

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
