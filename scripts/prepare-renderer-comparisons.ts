import { copyFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { comparisonCases } from "../tests/fixtures/renderer-parity/cases"
import { compileRendererCircuit } from "../tests/fixtures/renderer-parity/compile-circuit"
import { prepareRealPartAssets } from "./prepare-real-part-assets"
import type {
  ComparisonManifest,
  PreparedComparison,
} from "../tests/fixtures/renderer-parity/types"

const root = fileURLToPath(new URL("..", import.meta.url))
const publicRoot = join(root, "stories/renderer-comparison/public")
const generated = join(publicRoot, "generated")
const assets = join(publicRoot, "assets")
await mkdir(generated, { recursive: true })
await mkdir(assets, { recursive: true })

for (const [source, destination] of [
  [
    "tests/fixtures/renderer-parity/policy/TO-92_Inline.step",
    "real/TO-92_Inline.step",
  ],
  [
    "tests/fixtures/renderer-parity/policy/flashlight-usb.obj",
    "real/flashlight-usb.obj",
  ],
]) {
  const target = join(assets, destination!)
  await mkdir(dirname(target), { recursive: true })
  await copyFile(join(root, source!), target)
}
await prepareRealPartAssets(assets)

const exporterPackage = await Bun.file(
  fileURLToPath(
    new URL("../package.json", import.meta.resolve("circuit-json-to-gltf")),
  ),
).json()
const manifest: ComparisonManifest = {
  exporterVersion: exporterPackage.version,
  cases: [],
}
for (const definition of comparisonCases) {
  const { circuitJson, target, sourceCode } = await compileRendererCircuit(
    definition,
    root,
  )

  const entry: PreparedComparison = {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    category: definition.category,
    targetCadId: target.cad_component_id,
    sourceFile: definition.sourceFile,
    sourceCode,
    physicalExpectation: definition.physicalExpectation,
    circuitJson,
    exportMessages: [],
    camera: { ...definition.camera, target: [...definition.camera.target] },
  }
  if (definition.id === "calibration") {
    manifest.cases.push(entry)
    console.log(`${definition.id}: viewer-only calibration`)
    continue
  }
  const originalError = console.error
  const originalWarn = console.warn
  const record = (...values: unknown[]) => {
    entry.exportMessages.push(
      values
        .map((value) =>
          value instanceof Error
            ? `${value.name}: ${value.message}`
            : String(value),
        )
        .join(" "),
    )
  }
  try {
    console.error = record
    console.warn = record
    const glb = await convertCircuitJsonToGltf(structuredClone(circuitJson), {
      format: "glb",
      projectBaseUrl: pathToFileURL(`${publicRoot}/`).href,
      boardTextureResolution: 256,
    })
    if (!(glb instanceof ArrayBuffer))
      throw new Error("Exporter did not return binary GLB")
    await Bun.write(join(generated, `${definition.id}.glb`), glb)
    entry.glbUrl = `/renderer-comparison/generated/${definition.id}.glb`
  } catch (error) {
    // Renderer failures are evidence in this diagnostic suite, not successful
    // fallback geometry. The browser test will fail and attach this message.
    entry.exportError =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  } finally {
    console.error = originalError
    console.warn = originalWarn
  }
  manifest.cases.push(entry)
  console.log(`${definition.id}: ${entry.exportError ?? "GLB generated"}`)
}
await Bun.write(
  join(generated, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
)
