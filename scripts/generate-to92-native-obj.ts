import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { convertCircuitJsonTo3D } from "circuit-json-to-gltf"

const root = fileURLToPath(new URL("..", import.meta.url))
const source = "tests/fixtures/renderer-parity/policy/TO-92_Inline.step"
const destination =
  "tests/fixtures/renderer-parity/real-parts/assets/to92-native.obj"
const sourceSha256 =
  "f0b61c32ecbf0067157adc5a3d4966ceadf5d6dafe93c51af35f76c41c71a54a"

async function generateTo92NativeObj() {
  const packageJson = JSON.parse(
    await readFile(
      new URL("../package.json", import.meta.resolve("circuit-json-to-gltf")),
      "utf8",
    ),
  )
  if (packageJson.version !== "0.0.130") {
    throw new Error("Native capture requires circuit-json-to-gltf 0.0.130")
  }
  const bytes = await readFile(join(root, source))
  const digest = createHash("sha256").update(bytes).digest("hex")
  if (digest !== sourceSha256) throw new Error("TO-92 STEP source hash changed")

  const scene = await convertCircuitJsonTo3D(
    [
      {
        type: "cad_component",
        cad_component_id: "native-to92",
        pcb_component_id: "native-to92",
        source_component_id: "native-to92",
        anchor_alignment: "center",
        model_object_fit: "contain_within_bounds",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        model_origin_position: { x: 0, y: 0, z: 0 },
        model_step_url: `data:application/step;base64,${bytes.toString("base64")}`,
      },
    ],
    {
      coordinateTransform: {},
      drawFauxBoard: false,
      renderBoardTextures: false,
      showBoundingBoxes: false,
    },
  )
  const mesh = scene.boxes[0]?.mesh
  if (scene.boxes.length !== 1 || !mesh?.triangles.length) {
    throw new Error(
      "STEP decoding must produce actual mesh triangles, not a box",
    )
  }
  if (
    !("materials" in mesh) ||
    !mesh.materials?.size ||
    !mesh.materialIndexMap?.size
  ) {
    throw new Error("STEP decoding lost the source body and lead materials")
  }
  const lines = [
    "# Native KiCad TO-92_Inline_Narrow mesh; millimeters, Z-up.",
    `# Source: ${source}`,
    `# Source SHA-256: ${digest}`,
    "# Captured by scripts/generate-to92-native-obj.ts",
    "# Decoder: circuit-json-to-gltf@0.0.130 public convertCircuitJsonTo3D",
    "# Identity coordinateTransform; zero position/origin; no size, unit or board-normal override.",
    "# Triangle normals and material colors are retained from the public decoder.",
  ]
  const materialNames = new Map<number, string>()
  for (const [name, index] of mesh.materialIndexMap) {
    const material = mesh.materials.get(name)
    if (!material || !Array.isArray(material.color)) {
      throw new Error(`Missing decoded material color: ${name}`)
    }
    materialNames.set(index, name)
    const [r, g, b, alpha] = material.color
    lines.push(
      `newmtl ${name}`,
      `Kd ${r / 255} ${g / 255} ${b / 255}`,
      `d ${alpha}`,
      "endmtl",
    )
  }
  let previousMaterial: number | undefined
  for (const [index, triangle] of mesh.triangles.entries()) {
    const name = materialNames.get(triangle.materialIndex ?? -1)
    if (!name) throw new Error(`Triangle ${index} has no source material`)
    if (previousMaterial !== triangle.materialIndex) {
      lines.push(`usemtl ${name}`)
      previousMaterial = triangle.materialIndex
    }
    for (const point of triangle.vertices) {
      if (![point.x, point.y, point.z].every(Number.isFinite)) {
        throw new Error(`Triangle ${index} has invalid coordinates`)
      }
      lines.push(`v ${point.x} ${point.y} ${point.z}`)
    }
    const normal = triangle.normal
    if (
      ![normal.x, normal.y, normal.z].every(Number.isFinite) ||
      Math.hypot(normal.x, normal.y, normal.z) === 0
    ) {
      throw new Error(`Triangle ${index} has an invalid source normal`)
    }
    lines.push(
      `vn ${normal.x} ${normal.y} ${normal.z}`,
      `f ${index * 3 + 1}//${index + 1} ${index * 3 + 2}//${index + 1} ${index * 3 + 3}//${index + 1}`,
    )
  }
  const output = `${lines.join("\n")}\n`
  await mkdir(dirname(join(root, destination)), { recursive: true })
  await writeFile(join(root, destination), output)
  console.log(
    `${destination}: ${mesh.triangles.length} triangles, ${mesh.materials.size} materials, ${Buffer.byteLength(output)} bytes, sha256 ${createHash("sha256").update(output).digest("hex")}`,
  )
}

if (import.meta.main) await generateTo92NativeObj()
