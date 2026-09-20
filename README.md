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

### Non-blocking renderer comparison diagnostics

The `Diagnostics/Renderer Parity` stories compare the actual viewer with
`circuit-json-to-gltf` using the same Circuit JSON compiled from simple TSX.
Each repro mounts a real part on real pads or holes:

```bash
bun run storybook:comparisons
```

This opens the TO-92 X-axis mounting-correction story directly instead of
restoring an unrelated story. The ordinary `bun run storybook` entry point is
unchanged.

Each comparison story automatically displays **both oblique and side geometry**
once its model geometry loads. Both panels remain visible, with the exact
unlit/no-texture PNGs, edge maps, red/cyan overlays, and metrics used by the
browser tests. There are no comparison buttons. Click an image to download its
full-resolution PNG. The source TSX and a physical mounting criterion are shown
with each pair of renders.

circuit-json-to-gltf is a development-only dependency. A Bun preparation step generates
GLBs and records circuit-json-to-gltf failures; it is not imported into the viewer's
production bundle or the browser story. Model files are local, not fetched from
ModelCDN during the tests. The native STEP story uses the viewer's existing
OCCT CDN runtime.

`build-storybook` also prepares the fixture data, so the existing `vercel-build`
entry point publishes working comparison stories. Vercel hosts those static
stories; Playwright diagnostics run separately in GitHub Actions.

The browser suite has two separate roles:

```bash
# Blocking tests of the matcher itself and deliberate browser mutations
bun test ./tests/geometry-edge-*.test.ts ./tests/renderer-diagnostic-result.test.ts ./tests/renderer-comparison-*.test.ts ./tests/renderer-usb-mounting.test.ts
bun run test:renderer-calibration

# Diagnostic comparisons: failures are reported but do not gate a completed run
bun run test:renderer-comparisons
bunx --no-install playwright show-report
```

Install the test browser with `bunx playwright install chromium` if Playwright
reports that its Chromium executable is missing.

CI uses Ubuntu, Node 22, Bun 1.3.14 and the Chromium version paired with the
pinned Playwright dependency. `playwright install --with-deps chromium`
installs the Linux browser libraries; captures use software WebGL and require
no physical GPU. Playwright executes under Node even when launched by a Bun
package script.

A local Node 26 `module.register()` deprecation warning is not a test failure;
Node 22 is the CI runtime. Vite messages about missing dependency source maps
(for example `manifold-3d/lib/wasm.js.map`) concern debugger metadata, not a
missing JavaScript or WebAssembly module. A run ending in `passed` completed
successfully. Runtime/model-loading errors are still surfaced normally; the
harness does not blanket-suppress logs.

Actual comparisons are ordinary failing Playwright assertions, not skipped or
automatically approved baselines. The runner retains those failures and their
artifacts but returns success after a completed diagnostic report, making it
non-blocking for local gate runners too. Missing reports, global runner errors,
and interrupted runs still fail. For strict exit behavior, invoke
`bunx playwright test --project=diagnostics` directly.

The CI comparison step additionally has `continue-on-error: true`.
Dependency setup, matcher/runner unit tests, and browser calibration remain blocking.
The workflow always uploads the HTML report, geometry images, edge maps, diff
overlays, metadata, and failure traces.

The geometry pass isolates the studied CAD component, preserves its actual
world placement, and uses neutral unlit surfaces rather than textures/shadows.
The exported GLB receives only the fixed frame conversion back to project
coordinates: `P = (-G.x, G.z, G.y)`. Both sides use the same orthographic camera
and viewport. There is no recentering, image registration, or per-renderer fit.

The matcher checks edge coverage in both directions with a 1.5-pixel tolerance
and at most 1% unmatched edges on each side. It does not average differences
over the whole PCB image. Browser calibration requires identical geometry to
match and deliberate X-sign, rotation-order, and 0.2248885 mm origin errors to
be rejected. Pixel agreement is not a substitute for the existing numerical
placement tests, and it is not a test of material or normal appearance.
The calibration case has no exported GLB and compares viewer geometry only, so
browser-side exporter failures remain in the non-blocking diagnostic stage.
Diff overlays show unmatched viewer edges in red, unmatched exporter edges in
cyan, and covered edges in gray.

The real TO-92 model is exported in three alternative source orientations.
Authored 90-degree X, Y, or combined X/Y corrections must restore an upright
transistor with leads through all three holes. Separate TO-92 and USB-C
flashlight TSX repros retain the missing-origin behavior. Generated output
lives in ignored directories, never committed PNG baselines. See
[`tests/fixtures/renderer-parity/README.md`](tests/fixtures/renderer-parity/README.md)
for source provenance and mechanical interpretation.

Comparator calibration is a separate `Diagnostics/Renderer Comparator Calibration`
story. Its deliberately mutated viewer copies test the matcher; they are not
presented as realistic renderer bugs. The existing numeric USB mounting unit
test remains independent of the reviewer-facing stories.

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
