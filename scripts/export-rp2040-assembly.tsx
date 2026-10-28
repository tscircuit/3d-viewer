import { mkdir, copyFile } from "node:fs/promises"
import { resolve, join } from "node:path"

/** Run in the board's own pinned dependency environment, keeping its saved
 * routing and ground-pour guards enabled. Do not compile this board using the
 * viewer's older development dependencies. See the fixture README. */
const source = process.argv[2]
if (!source)
  throw new Error(
    "Usage: bun scripts/export-rp2040-assembly.tsx <rp2040-source-directory> <output-directory>",
  )
const sourceDir = resolve(source)
// Compile PCB geometry with the board's pinned renderer. Export instructions
// from that same live TSX tree using the viewer's newer core/schema packages.
const explosionCoreModule = process.argv[4]
  ? resolve(process.argv[4])
  : import.meta.resolve("@tscircuit/core")
const schemaModule = import.meta.resolve("circuit-json")
const outputDir = resolve(process.argv[3] ?? "work/rp2040-assembly")
const buildDir = join(sourceDir, ".viewer-assembly")
await mkdir(buildDir, { recursive: true })
await copyFile(
  new URL(
    "../stories/fixtures/rp2040-motor-assembly/assembly.tsx",
    import.meta.url,
  ),
  join(buildDir, "assembly.tsx"),
)
await Bun.write(
  join(buildDir, "build.tsx"),
  `
import { Circuit } from "@tscircuit/core"
import { serializeAssemblyExplosion, getCircuitJsonAssemblyExplosion } from ${JSON.stringify(explosionCoreModule)}
import { any_circuit_element } from ${JSON.stringify(schemaModule)}
import Board from "../index.circuit"
import { Rp2040MotorAssembly } from "./assembly"
const circuit = new Circuit()
// An opaque root group provides schematic scope for the board beneath a device.
circuit.add(<group name="product" subcircuit><Rp2040MotorAssembly board={<Board />} /></group>)
await circuit.renderUntilSettled()
const geometry = circuit.getCircuitJson().filter(e => e.type !== "cad_explosion_stage" && e.type !== "cad_explosion_move")
const assembled = [...geometry, ...serializeAssemblyExplosion(circuit.children, geometry)]
const view = getCircuitJsonAssemblyExplosion(JSON.parse(JSON.stringify(assembled)))
if (assembled.filter(e => e.type === "pcb_board").length !== 1) throw new Error("Expected the real controller PCB")
if (assembled.some(e => e.type.endsWith("_error"))) throw new Error("Circuit build emitted errors")
const out = ${JSON.stringify(outputDir)}
await Bun.write(out + "/assembled.circuit.json", JSON.stringify(assembled))
await Bun.write(out + "/exploded.circuit.json", JSON.stringify(view.circuitJson))
// Diagnostic evaluator output, deliberately NOT presented as Circuit JSON.
await Bun.write(out + "/explosion-evaluation.json", JSON.stringify({ stages: view.stages, lines: view.lines, collisionCheckStatus: view.collisionCheckStatus }, null, 2))
const invalid = assembled.filter(e => !any_circuit_element.safeParse(e).success)
await Bun.write(out + "/schema-summary.json", JSON.stringify({records: assembled.length, rejectedRecords: invalid.length, rejectedTypes: invalid.reduce((counts, e) => ({...counts, [e.type]: (counts[e.type] ?? 0) + 1}), {})}, null, 2))
console.log(JSON.stringify({ records: assembled.length, cadComponents: assembled.filter(e => e.type === "cad_component").length, stages: view.stages, rejectedBySchema: invalid.length }, null, 2))
`,
)
const proc = Bun.spawn([process.execPath, join(buildDir, "build.tsx")], {
  cwd: sourceDir,
  stdout: "inherit",
  stderr: "inherit",
})
if ((await proc.exited) !== 0)
  throw new Error(
    "Assembly export failed; keep the upstream board guards enabled",
  )
