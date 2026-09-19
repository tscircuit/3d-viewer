import { copyFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { comparisonCases } from "../tests/fixtures/renderer-parity/cases"
import { applyComparisonCase } from "../tests/fixtures/renderer-parity/apply-case"
import type {
  ComparisonManifest,
  PreparedComparison,
} from "../tests/fixtures/renderer-parity/types"

const root = fileURLToPath(new URL("..", import.meta.url))
const fixtureRoot = join(root, "tests/fixtures/renderer-parity")
const publicRoot = join(root, "stories/renderer-comparison/public")
const generated = join(publicRoot, "generated")
const assets = join(publicRoot, "assets")
await mkdir(generated, { recursive: true })
await mkdir(assets, { recursive: true })

for (const [source, destination] of [
  ["stories/assets/myObj.obj", "contact.obj"],
  ["stories/assets/myGltf.gltf", "myGltf.gltf"],
  ["stories/assets/myGlb.glb", "contact.glb"],
  ["tests/fixtures/renderer-parity/assets/micro-xnj-zb.obj", "usb.obj"],
]) {
  await copyFile(join(root, source!), join(assets, destination!))
}
const gltf = await Bun.file(join(assets, "myGltf.gltf")).json()
for (const dependency of [...(gltf.buffers ?? []), ...(gltf.images ?? [])]) {
  if (!dependency.uri || dependency.uri.startsWith("data:")) continue
  if (/^[a-z]+:/i.test(dependency.uri) || dependency.uri.includes(".."))
    throw new Error(
      `Fixture contains a nonlocal glTF dependency: ${dependency.uri}`,
    )
  const target = join(assets, dependency.uri)
  await mkdir(dirname(target), { recursive: true })
  await copyFile(join(root, "stories/assets", dependency.uri), target)
}

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
  const isUsb = definition.format === "usb"
  const seed: AnyCircuitElement[] = await Bun.file(
    join(fixtureRoot, isUsb ? "usb.circuit.json" : "clip.circuit.json"),
  ).json()
  const { circuit, target } = applyComparisonCase(seed, definition)

  const entry: PreparedComparison = {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    category: definition.category,
    targetCadId: target.cad_component_id,
    circuitJson: circuit,
    exportMessages: [],
    camera: {
      target: [target.position.x, target.position.y, target.position.z],
      span: isUsb ? 13 : 4.5,
      fromBelow: "layer" in definition && definition.layer === "bottom",
    },
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
    const glb = await convertCircuitJsonToGltf(circuit, {
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
