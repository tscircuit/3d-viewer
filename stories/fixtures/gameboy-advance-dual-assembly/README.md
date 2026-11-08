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

Eight stages separate access panels, case screws, rear housing, internal
fasteners, front housing, display, controls, and speaker. All 56 moving parts
use the existing manifest's `explode` vectors. The volume wheel, USB cable,
and all PCB-mounted electronics remain fixed. Joystick flex models move rigidly.
This is an exploded visualization, not a collision-validated assembly procedure;
the source project's existing mechanical fit and fabrication review holds apply.

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
