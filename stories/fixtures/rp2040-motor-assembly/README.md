# Real RP2040 / NEMA17 explosion fixture

Source board: [imrishabh18/rp2040-motor-controller v1.0.48](https://tscircuit.com/imrishabh18/rp2040-motor-controller), release `bc93e130-7357-4352-a45f-c9cf65563446`.

`assembly.tsx` is the custom assembly. It contains a NEMA17, four hollow nylon spacers, four M3x35 socket-head bolts, a vented PETG cover with mounting posts, and four authored explosion stages. The original board TSX is passed as `board={<Board />}`. The export uses its original routed copper, imported component footprints/models and ground-pour guards.

The generated fixture contains 5,117 records, one four-layer 42.30 × 42.32 mm PCB, 300 traces, 303 vias and 117 CAD components. PCB geometry (board, components, traces, vias, pads, plated holes and pours) was compared with a standalone build after removing identity fields, with no differences at six decimal places. This is a visualization fixture, not a new fabrication release.

## Reproduce from original TSX

Download the source files for the pinned release using `/package_files/list?package_release_id=bc93e130-7357-4352-a45f-c9cf65563446` and `/package_files/download?package_release_id=...&file_path=...`. Retain `index.circuit.tsx`, `schematic/`, `imports/`, `assets/`, `mechanical/`, `routing/`, `engineering/jlcpcb-clearance-rules.json`, `vendor/`, `patches/`, `package.json` and the lockfile. Install the board's own dependencies with Bun in that source directory.

```sh
bun scripts/export-rp2040-assembly.tsx /path/to/rp2040-source /path/to/exports
```

The script copies the assembly TSX into the board's dependency environment and renders the original board TSX inside it. It exports assembled and exploded Circuit JSON, diagnostic guide/stage output and a schema summary. Update `assembled.circuit.json` here from those results. It includes four stage records and four move records; the story needs only this file.

PCB rendering stays on the board's original core 0.0.2199, props 0.0.709 and footprinter 0.0.444 with its copper-preservation guards enabled. Published core 0.0.2234 and schema 0.0.539 export the settled TSX tree using the explicit `serializeAssemblyExplosion` compatibility adapter. The viewer receives only the generated Circuit JSON. An outer `<group subcircuit>` provides schematic scope under the assembly device.

Regeneration with the published exporter produces exactly the same 5,117 records, byte for byte. `generation.json` records the renderer/exporter versions and SHA-256 hashes of the authored assembly TSX and final Circuit JSON. Copy it alongside `assembled.circuit.json` when regenerating.

The test `rp2040-explosion-tsx-export.test.tsx` checks those hashes and renders the same mechanical assembly TSX through core's normal CAD phases. It compares all emitted stages, memberships and movements with this fixture, resolving generated IDs to source names.

## Circuit JSON and core gaps

1. **Serialized explosion program.** The schema from [circuit-json #937](https://github.com/tscircuit/circuit-json/pull/937) is published in `circuit-json@0.0.539`; this fixture uses that release and published `@tscircuit/core@0.0.2234` from [core #4990](https://github.com/tscircuit/core/pull/4990). Core exports stages, explicit membership, ordered movements and typed whole-stage targets into the assembled JSON. The viewer evaluates these records directly. The first stage targets `cover` and the entire `remove-bolts` stage, lifting them 24 mm together. The second stage removes the bolts with another 41 mm lift; the remaining stages separate the motor and spacers.
2. **PCB movement is rejected.** Core's evaluator rejects targets containing Board/PCB or cable geometry. This example leaves the PCB fixed and moves mechanical parts around it. Moving the controller as a rigid body needs a transform applying to all its PCB geometry, traces, holes, CAD and reference surfaces.
3. **Raw core exports fail some schema checks.** With both the original schema 0.0.534 and schema 0.0.539, the standalone board has 200 rejected records; the assembly has 201. The existing failures are null `subcircuit_id` values on groups, numeric `display_offset_x/y` on PCB components/groups where the schema expects strings, null `anchor_alignment` on PCB groups, and null `pcb_component_id` on some silkscreen text. The wrapper contributes one additional PCB group with null `anchor_alignment`. These raw exports are rendered successfully but are not claimed to be schema-clean. No fields were silently coerced or stripped.
4. **Fastener semantics are limited.** The assembly uses `assembly.part` rather than a fastening primitive. Its real M3 socket-head mesh does not encode fastening relationships.
5. **Full-board compilation/import still has limitations.** Compiling the original board directly with core 0.0.2234 still trips its ground-pour guard. Importing its standalone JSON through `<subcircuit circuitJson>` fails because core has no inflator for `simple_fuse`. The pinned TSX build and explicit compatibility exporter preserve the real fuse and all routed copper without bypassing either limitation.

The board stays at z=0. Motor rear face is z=-10; spacers span -10..-0.8; cover posts span 0.8..19; lid spans 19..21; bolt head undersides are z=21. Hole centers are (±15.5, ±15.5) mm. The nominal screws engage the modeled rear face by 4 mm. NEMA frame size does not guarantee a physical motor's rear thread pattern, encoder/magnet clearance or screw length. No cable or encoder magnet is claimed in this fixture, and core does not check swept collision clearance.

The PCB perimeter derives from PD-Stepper; its upstream GPL-3.0 license is included as `PD-Stepper-LICENSE`. Original source attribution and mechanical caveats are retained in the source bundle.
