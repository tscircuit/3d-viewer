# @tscircuit/3d-viewer

> [!NOTE]
> We are working on a new vanilla THREE version of the 3d viewer, it's on the [v01 branch](https://github.com/tscircuit/3d-viewer/tree/v01)

A 3D printed circuit board viewer for [Circuit JSON](https://github.com/tscircuit/circuit-json) and [tscircuit](https://github.com/tscircuit/tscircuit)

[![npm version](https://badge.fury.io/js/%40tscircuit%2F3d-viewer.svg)](https://badge.fury.io/js/%40tscircuit%2F3d-viewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://docs.tscircuit.com) &middot; [Website](https://tscircuit.com) &middot; [Twitter](https://x.com/tscircuit) &middot; [Discord](https://tscircuit.com/community/join-redirect) &middot; [Quickstart](https://docs.tscircuit.com/quickstart) &middot; [Online Playground](https://tscircuit.com/playground)

![image](https://github.com/user-attachments/assets/107624fc-f3e5-4652-a90e-a5462afa6fbe)

## Features

- 3D visualization of PCB layouts
- Interactive camera controls (pan, zoom, rotate)
- Support for various PCB components (resistors, capacitors, Chips, etc.)
- Customizable board and component rendering

## Installation

```bash
npm install @tscircuit/3d-viewer
```

## Usage

### Basic Example

```jsx
import React from "react"
import { CadViewer } from "@tscircuit/3d-viewer"

const MyPCBViewer = () => {
  return (
    <CadViewer>
      <board width="20mm" height="20mm">
        <resistor
          name="R1"
          footprint="0805"
          resistance="10k"
          pcbX={5}
          pcbY={5}
        />
        <capacitor
          name="C1"
          footprint="0603"
          capacitance="1uF"
          pcbX={-4}
          pcbY={0}
        />
      </board>
    </CadViewer>
  )
}

export default MyPCBViewer
```

### Using with circuitJson Data

```jsx
import React from "react"
import { CadViewer } from "@tscircuit/3d-viewer"
import mycircuitJsonData from "./mycircuitJsonpData.json"

const MyPCBViewer = () => {
  return <CadViewer circuitJson={mycircuitJsonData} />
}

export default MyPCBViewer
```

### Converting to SVG (Node.js)

When using the SVG converter in Node.js environments, you'll need to provide JSDOM:

```typescript
import { JSDOM } from 'jsdom'
import { convert3dCircuitToSvg } from '@tscircuit/3d-viewer/3d'
import { applyJsdomShim } from '@tscircuit/3d-viewer/utils'

// Setup JSDOM environment
const dom = new JSDOM()
applyJsdomShim(dom)

// Convert circuit to SVG
const options = {
  width: 800,
  height: 600,
  backgroundColor: "#ffffff",
  padding: 20,
  zoom: 50,
  camera: {
    position: { x: 0, y: 0, z: 100 },
    lookAt: { x: 0, y: 0, z: 0 }
  }
}

const svgString = await convert3dCircuitToSvg(circuitJson, options)
```

The `convert3dCircuitToSvg` function accepts the following options:
- `width`: Width of the output SVG (default: 800)
- `height`: Height of the output SVG (default: 600)
- `backgroundColor`: Background color in hex format (default: "#ffffff")
- `padding`: Padding around the board (default: 20)
- `zoom`: Zoom level (default: 1.5)
- `camera`: Camera position and lookAt configuration
  - `position`: {x, y, z} coordinates for camera position
  - `lookAt`: {x, y, z} coordinates for camera target

## API Reference

### `<CadViewer>`

Main component for rendering the 3D PCB viewer.

Props:

- `circuit-json`: (optional) An array of AnyCircuitElement objects representing the PCB layout.
- `children`: (optional) React children elements describing the PCB layout (alternative to using `circuit-json`).
- `resolveStaticAsset`: (optional) Function that receives each component model URL (`obj`, `wrl`, `stl`, `gltf`, `glb`, `step`) and returns the resolved URL to load.

### `<board>`

Defines the PCB board dimensions.

Props:

- `width`: Width of the board (e.g., "20mm").
- `height`: Height of the board (e.g., "20mm").

### Component Elements

Various component elements can be used as children of the `<board>` element:

- `<resistor>`
- `<capacitor>`
- `<chip>`
- `<bug>` (for ICs)

Each component has specific props for defining its characteristics and position on the board.

## Advanced Usage

### Custom Component Models

You can define custom 3D models for components using the `cadModel` prop:

```jsx
<chip
  name="U1"
  footprint="soic8"
  cadModel={{
    objUrl: "/path/to/custom-model.obj",
    mtlUrl: "/path/to/custom-material.mtl",
  }}
/>
```

### JSCAD Models

For more complex or programmatically defined models, you can use JSCAD:

```jsx
<bug
  footprint="soic8"
  name="U1"
  cadModel={{
    jscad: {
      type: "cube",
      size: 5,
    },
  }}
/>
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## Related Projects

- [Schematic Viewer](https://github.com/tscircuit/schematic-viewer)
- [PCB Viewer](https://github.com/tscircuit/pcb-viewer)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
