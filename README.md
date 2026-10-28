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

### Navigate to a schematic component

Pass `onViewSchematicComponent` to enable **Show on schematic** when a user
right-clicks a component model (or long-presses it on touch devices). The callback
receives `{ source_component_id, pcb_component_id, refdes }`, matching the PCB
viewer. The host can switch tabs and focus the schematic using the source ID.
Omit the callback when schematic navigation is unavailable.

```tsx
;<CadViewer
  circuitJson={circuitJson}
  onViewSchematicComponent={({ source_component_id }) => {
    // Find the schematic component with this source ID and focus it.
    showSchematicComponent(source_component_id)
  }}
/>
```

### Converting to SVG (Node.js)

When using the SVG converter in Node.js environments, you'll need to provide JSDOM:

```typescript
import { JSDOM } from "jsdom"
import { convert3dCircuitToSvg } from "@tscircuit/3d-viewer/3d"
import { applyJsdomShim } from "@tscircuit/3d-viewer/utils"

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
    lookAt: { x: 0, y: 0, z: 0 },
  },
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
`circuit-json-to-gltf` using the same Circuit JSON and local model assets:

```bash
bun run storybook:comparisons
```

This opens `Diagnostics/Renderer Parity / X Rotation` directly instead of
restoring an unrelated story. The ordinary `bun run storybook` entry point is
unchanged.

Each comparison story automatically displays **both oblique and side geometry**
once its model geometry loads. Both panels remain visible, with the exact
unlit/no-texture PNGs, edge maps, red/cyan overlays, and metrics used by the
browser tests. There are no comparison buttons. Click an image to download its
full-resolution PNG. Bottom-layer fixtures use cameras below the PCB.

circuit-json-to-gltf is a development-only dependency. A Bun preparation step generates
GLBs and records circuit-json-to-gltf failures; it is not imported into the viewer's
production bundle or the browser story. Model files are local, not fetched from
ModelCDN during the tests.

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

Cases keep rotation, origin inference, format dispatch, and the physical USB
mounting example separate. Explicit-origin zero/Z cases are controls; missing-origin
cases retain their original alignment tags. Generated output lives in ignored
directories, never committed PNG baselines. See
[`tests/fixtures/renderer-parity/README.md`](tests/fixtures/renderer-parity/README.md)
for source provenance and the common-board adaptation.

Nonzero angle probes use oblique values (for example X=37, Y=30, Z=47, and
mixed 23/31/47), not quarter turns that can conceal symmetry and axis mistakes.
Zero angles and the renderer's implicit bottom-layer fallback remain deliberate
controls. The physical USB mounting fixture is a documented exception: its
native Z-up mesh requires Z=270 degrees to fit the footprint. Actual tab/hole
and contact/pad geometry is checked separately. The original USB missing-origin
input remains a distinct diagnostic, not the mounted pose's zero-angle control.

### Custom Component Models

You can define custom 3D models for components using the `cadModel` prop:

```jsx
;<chip
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
;<bug
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


### Section views

Right-click the viewer and choose **Advanced → Section View…**.
The Advanced submenu also contains the engine switch for generated scenes.
Choose X, Y, or Z, then drag the translucent plane or its arrow to move the cut.
The slider and millimeter field provide precise positioning; **Flip side** changes
which half remains visible. **Look perpendicular** faces the cut directly; in that
view, drag vertically to change its depth. Closing the controls preserves the cut;
**Clear** restores the complete assembly.

Cut faces use a 45-degree diagonal hatch, with holes and cavities left empty.
Sections work with both rendering engines and are baked into downloaded glTFs.
Cap loops are computed in a worker, with a synchronous fallback if workers are
unavailable. Open model boundaries are left uncapped and reported in the panel.

Run section geometry, drag, and export checks with `bun test tests/section-*`.
Browser interaction checks, including GLB URLs, are available with `bun run test:sections`.
Sections also support pre-rendered `glbUrl` and `glbData` sources, including model replacement.

### Pre-rendered GLB scenes

To open a self-contained GLB produced by `circuit-json-to-gltf` without rebuilding
board geometry or fetching component models:

```tsx
<CadViewer glbUrl="/previews/board.glb" />
// Or use bytes already available in memory:
<CadViewer glbData={arrayBuffer} />
```

Supply one GLB source. It takes precedence over `circuitJson` and JSX children.
The viewer restores the exporter's coordinate frame (+Y up, mm) to the normal
viewer frame (+Z up, mm), fits the camera, and retains orbit controls and camera
presets. Failed loads display an error; replacing a source cancels the previous
load and disposes its geometry, materials, and textures.

New exports carry lightweight identity in each component node's
`extras.tscircuit`: `componentName`, `cad_component_id`, `source_component_id`,
and `pcb_component_id` (when available). These support name tooltips, hiding
individual components, and `onViewSchematicComponent` without supplying Circuit
JSON. Existing GLBs without metadata still render. Board layers, folding, and
model appearance are baked into the GLB; regenerate it to change them.

### TSX assembly explosion views

Right-click the viewer and select **Advanced → Exploded view…** to open the
built-in slider. `CadViewer` retains the rendered TSX tree when it contains
`assembly.explosion.stage` instructions. Drag the slider to advance through ordered
stages and their moves, or select **Reset** to return to the assembled view.
Movement guides appear as dashed lines. Both Manifold and JSCAD support this view.

```tsx
import { assembly } from "@tscircuit/core"
import { CadViewer } from "@tscircuit/3d-viewer"

<CadViewer>
  <assembly.device name="case">
    <assembly.part name="lid" cadModel={{ jscad: { type: "cube", size: 8 } }} />
    <assembly.explosion.stage name="lift">
      <assembly.explosion.move targetRef="lid" offZ="20mm" />
    </assembly.explosion.stage>
  </assembly.device>
</CadViewer>
```

For an existing circuit, first `await circuit.renderUntilSettled()`, then pass
`<CadViewer circuit={circuit} />`. Replace the circuit instance when the design
changes. `circuitJson` takes precedence over `circuit` and TSX children. JSON-only
inputs without a target pose and pre-rendered GLB inputs have no explosion
information, so the menu action is disabled.
TSX children are rendered asynchronously before displaying the assembly.

Core evaluates stage ordering, sequential moves, multi-target moves, and mounted
assembly frames. The viewer applies translations without rebuilding models or
resetting the camera. Invalid explosion instructions display an error while
leaving the assembled geometry visible. Core currently supports mechanical CAD
moves only; PCB/cable-containing targets are rejected. These views do not verify
collision clearance.

For JSON exports, supply both poses to the same built-in control:

```tsx
<CadViewer
  circuitJson={assembledCircuitJson}
  explodedCircuitJson={explodedCircuitJson}
/>
```

The viewer interpolates CAD translations between these poses. Both exports must
preserve CAD IDs, models, rotations, PCB geometry and source records. This does
not restore authored stage ordering: Circuit JSON does not currently serialize
explosion instructions. The target pose takes precedence over live TSX stages.
Closing the control resets the assembly.

See **Assembly / Explosion / Staged Tsx** and **Rp2040 Motor Assembly** in Storybook. Run the browser regression
with `bunx playwright test --config playwright.explosion.config.ts`.
