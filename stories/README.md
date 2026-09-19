# Storybook development

Run the commands below from the repository root.

## Non-blocking renderer comparison diagnostics

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
[`tests/fixtures/renderer-parity/README.md`](../tests/fixtures/renderer-parity/README.md)
for source provenance and the common-board adaptation.

Nonzero angle probes use oblique values (for example X=37, Y=30, Z=47, and
mixed 23/31/47), not quarter turns that can conceal symmetry and axis mistakes.
Zero angles and the renderer's implicit bottom-layer fallback remain deliberate
controls. The physical USB mounting fixture is a documented exception: its
native Z-up mesh requires Z=270 degrees to fit the footprint. Actual tab/hole
and contact/pad geometry is checked separately. The original USB missing-origin
input remains a distinct diagnostic, not the mounted pose's zero-angle control.
