# Renderer comparison diagnostics

The `Renderer Parity` stories compare the actual viewer with
`circuit-json-to-gltf` using the same Circuit JSON compiled from simple TSX.
Each repro mounts a real part on real pads or holes:

```bash
bun run storybook:comparisons
```

This opens the TO-92 missing-origin story directly instead of restoring an
unrelated story. The ordinary `bun run storybook` entry point is unchanged.

Each comparison story automatically displays **both oblique and side geometry**
once its model geometry loads. Both panels remain visible, with the exact
unlit/no-texture PNGs, edge maps, red/cyan overlays, and metrics used by the
browser tests. Camera buttons switch between oblique and side views without
changing either renderer's placement. Click an image to download its
full-resolution PNG. The source TSX and a physical mounting criterion are shown
with each pair of renders.

`circuit-json-to-gltf` is a development-only dependency. A Bun preparation step
generates GLBs and records exporter failures; it is not imported into the
viewer's production bundle or the browser story. The flashlight TSX references
the original C165948 ModelCDN URL; the TO-92 STEP uses a commit-pinned raw
GitHub URL. The native STEP story uses the viewer's existing OCCT CDN runtime.

`build-storybook` also prepares the fixture data, so the existing `vercel-build`
entry point publishes working comparison stories. Vercel hosts those static
stories; Playwright diagnostics run separately in GitHub Actions.

## Blocking and non-blocking tests

The browser suite has two separate roles:

```bash
# Blocking tests of the matcher itself and deliberate browser mutations
bun run test:renderer-fixtures
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

The CI comparison step additionally has `continue-on-error: true`. Dependency
setup, matcher/runner unit tests, and browser calibration remain blocking. The
workflow always uploads the HTML report, geometry images, edge maps, diff
overlays, metadata, and failure traces.

## Geometry comparison

The geometry pass isolates the studied CAD component, preserves its actual
world placement, and uses neutral unlit surfaces rather than textures/shadows.
The exported GLB receives only the fixed coordinate conversion required to
display it in the viewer. Both sides use the same orthographic camera and
viewport. There is no recentering, image registration, or per-renderer fit.

The matcher checks edge coverage in both directions with a 1.5-pixel tolerance
and at most 1% unmatched edges on each side. It does not average differences
over the whole PCB image. Browser calibration requires identical geometry to
match and deliberate X-sign, rotation-order, and 0.2248885 mm origin errors to
be rejected. Pixel agreement is not a substitute for the existing numerical
placement tests, and it is not a test of material or normal appearance. The
calibration case has no exported GLB and compares viewer geometry only, so
browser-side exporter failures remain in the non-blocking diagnostic stage.
Diff overlays show unmatched viewer edges in red, unmatched exporter edges in
cyan, and covered edges in gray.

## Physical repros

The original TO-92 STEP and USB-C flashlight TSX repros retain their
missing-origin behavior in separate categories. The manufactured TO-92 source
orientations have been removed. The actual M.2 upright assembly demonstrates
placement rotation using a TSX-authored daughtercard.

Each physical example has one explicit browser test per file. Generated output
lives in ignored directories, never committed PNG baselines. See
[`tests/fixtures/renderer-parity/README.md`](../../tests/fixtures/renderer-parity/README.md)
for source provenance and mechanical interpretation.

Comparator calibration is a separate `Renderer Parity/Comparator Calibration`
story. Its deliberately mutated viewer copies test the matcher; they are not
presented as realistic renderer bugs. The existing numeric USB mounting unit
test remains independent of the reviewer-facing stories.
