# @tscircuit/3d-viewer

A 3D printed circuit board viewer for [tscircuit](https://github.com/tscircuit/tscircuit).

[![npm version](https://badge.fury.io/js/%40tscircuit%2F3d-viewer.svg)](https://badge.fury.io/js/%40tscircuit%2F3d-viewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://docs.tscircuit.com) &middot; [Website](https://tscircuit.com) &middot; [Twitter](https://x.com/tscircuit) &middot; [Discord](https://tscircuit.com/community/join-redirect) &middot; [Quickstart](https://docs.tscircuit.com/quickstart) &middot; [Online Playground](https://tscircuit.com/playground)

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

### Using with Soup Data

```jsx
import React from "react"
import { CadViewer } from "@tscircuit/3d-viewer"
import mySoupData from "./mySoupData.json"

const MyPCBViewer = () => {
  return <CadViewer soup={mySoupData} />
}

export default MyPCBViewer
```

## API Reference

### `<CadViewer>`

Main component for rendering the 3D PCB viewer.

Props:

- `soup`: (optional) An array of AnySoupElement objects representing the PCB layout.
- `children`: (optional) React children elements describing the PCB layout (alternative to using `soup`).

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
