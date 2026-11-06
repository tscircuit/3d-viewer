// Regenerates tests/assets/prerendered-board.glb with the installed
// circuit-json-to-gltf: a textured board with via plating and one CAD part.
// Needs an exporter that tags board nodes with extras.tscircuit.pcb_board_id
// (tscircuit/circuit-json-to-gltf#285, after 0.0.164); older ones write a
// fixture the board test rejects.
// Run: bun scripts/generate-prerendered-board-glb.ts
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"

// 2 mm cube centered on its model origin (mm), so its placement does not
// depend on the exporter's STL up-axis convention.
const cubeStl = (() => {
  const v = (x: number, y: number, z: number) => [x, y, z].join(" ")
  const quads: [string, string[]][] = [
    ["0 0 1", [v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)]],
    ["0 0 -1", [v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1), v(1, -1, -1)]],
    ["1 0 0", [v(1, -1, -1), v(1, 1, -1), v(1, 1, 1), v(1, -1, 1)]],
    ["-1 0 0", [v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1)]],
    ["0 1 0", [v(-1, 1, -1), v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1)]],
    ["0 -1 0", [v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1)]],
  ]
  const facets = quads.flatMap(([normal, [a, b, c, d]]) =>
    [
      [a, b, c],
      [a, c, d],
    ].map(
      (triangle) =>
        `facet normal ${normal}\nouter loop\n${triangle.map((p) => `vertex ${p}`).join("\n")}\nendloop\nendfacet`,
    ),
  )
  return `solid cube\n${facets.join("\n")}\nendsolid cube`
})()

// Board spans x 0..20, y 0..10 (circuit mm), top face at z = 0.8. U1 sits on
// it at (5, 5), z 0.8..2.8; the via at (14, 5) opens through a pad, so the
// board also exports "Via Plating".
const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 10, y: 5 },
    width: 20,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  { type: "source_component", source_component_id: "source1", name: "U1" },
  {
    type: "pcb_component",
    pcb_component_id: "pcb1",
    source_component_id: "source1",
    center: { x: 5, y: 5 },
    width: 2,
    height: 2,
    layer: "top",
    rotation: 0,
  },
  {
    type: "cad_component",
    cad_component_id: "cad1",
    source_component_id: "source1",
    pcb_component_id: "pcb1",
    position: { x: 5, y: 5, z: 1.8 },
    rotation: { x: 0, y: 0, z: 0 },
    model_stl_url: `data:model/stl,${encodeURIComponent(cubeStl)}`,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad",
    pcb_component_id: "pcb1",
    shape: "rect",
    x: 13.3,
    y: 5,
    width: 1.4,
    height: 2,
    layer: "top",
  },
  {
    type: "pcb_via",
    pcb_via_id: "via",
    x: 14,
    y: 5,
    hole_diameter: 1,
    outer_diameter: 1.5,
    layers: ["top", "bottom"],
    tented_on_top: true,
    tented_on_bottom: true,
  },
] as CircuitJson

const glb = (await convertCircuitJsonToGltf(circuitJson, {
  format: "glb",
  boardTextureResolution: 64,
})) as ArrayBuffer
const target = new URL("../tests/assets/prerendered-board.glb", import.meta.url)
await Bun.write(target, glb)
console.log(`wrote ${glb.byteLength} bytes to ${target.pathname}`)
