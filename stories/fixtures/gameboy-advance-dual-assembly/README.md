# Game Boy Advance dual RP2350 explosion

Source: https://tscircuit.com/abse/gameboy-advance-dual-rp2350#files

Pinned version: **0.3.0-review.8**, release `f18f9b16-dac9-4c8d-9be5-0829dc6eb3c0`.
The fixture preserves all 19,159 published `dist/index/circuit.json` records,
including 285 CAD components. Relative CAD URLs are resolved to the pinned
registry release; models require network access. No board routing, placements,
or model transforms are rebuilt.

`assembly.tsx` exports `GameBoyEnclosure`, an adaptation of the package's
`mechanical/enclosure.tsx` with native `assembly.explosion` stages. To use it in
the source package, replace `mechanical/enclosure.tsx` with this file (keep its
adjacent `manifest.json` and `cad-models.ts`). This viewer PR does not publish a
new registry package release.

Six stages form three remove/park pairs: user accessories (battery door, four AA
cells, SD card, USB cable), rear housing, and the complete front assembly.
The front assembly retains its LCD, joysticks, controls, and speaker so the shell
does not pass through its attached modules. The PCB-mounted electronics stay fixed.

Each group clears the assembly before moving left together. Parking moves follow
separate X and Y segments rather than diagonal shortcuts. The overhead camera
shows the main assembly on the right and parked groups on the left, like a
workbench. Reverse playback brings the groups back in assembly order.

### Clearance validation and remaining extraction collisions

`rendered-bounds.json` captures the actual rendered meshes in circuit coordinates.
The unit test checks the entire swept bounding box of every parking segment
against all other rendered parts. Those continuous checks pass.

`clearance-report.json` records a triangle-mesh audit using python-fcl at a maximum
0.25 mm travel interval. It found 66 initial contacts in the source model and **two
remaining extraction collisions**: battery door/rear shell and front shell/power
switch. There are no additional collisions in the checked motions. This is not a
collision-free assembly procedure: sampling cannot prove continuous clearance,
and the translation-only engine cannot simulate tilting the door or shell to
release interlocking features. The source project's fit/fabrication holds remain.

To reproduce the mesh audit, first serve the Playwright fixture with
`bunx vite --config playwright/vite.config.ts`, then:

```sh
node scripts/export-gameboy-clearance-meshes.mjs /tmp/gba-meshes
python -m venv /tmp/gba-clearance-venv
/tmp/gba-clearance-venv/bin/pip install numpy python-fcl
/tmp/gba-clearance-venv/bin/python scripts/check-gameboy-clearance.py /tmp/gba-meshes stories/fixtures/gameboy-advance-dual-assembly/assembled.circuit.json /tmp/gba-clearance-report.json
```

Set `CHROMIUM_PATH` when using a system Chromium. The mesh audit intentionally
exits nonzero while the two extraction collisions remain. Meshes are temporary
verification artifacts; the audit includes every rendered mechanical part and
PCB/component mesh, but cannot check source components without rendered geometry.

`build.tsx` renders the native enclosure to obtain the explosion program, matches
its mechanical CAD targets to the published records by source name, and appends
only the stage/move records. Missing or ambiguous targets fail the export.
`manifest.json` and `cad-models.ts` come from the pinned source release.

To regenerate from the published circuit JSON:

```sh
curl -fL 'https://api.tscircuit.com/package_files/download?package_release_id=f18f9b16-dac9-4c8d-9be5-0829dc6eb3c0&file_path=dist%2Findex%2Fcircuit.json' -o /tmp/gba-dual.circuit.json
bun scripts/export-gameboy-advance-dual-assembly.tsx /tmp/gba-dual.circuit.json
bun test tests/gameboy-advance-dual-explosion.test.tsx
```

Open **Assembly / Explosion / Gameboy Advance Dual Rp2350** in Storybook, then
right-click the viewer → Advanced → Exploded view. Playback uses the viewer's
default two seconds per stage and configurable duration.
