import { createHash } from "node:crypto"
import { copyFile, mkdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { createElement } from "react"
import { Circuit } from "tscircuit"
import Daughtercard from "../tests/fixtures/renderer-parity/circuits/m2-daughtercard.circuit"
import { compileRendererCircuit } from "../tests/fixtures/renderer-parity/compile-circuit"
import {
  m2SocketSha256,
  m2SocketUrl,
} from "../tests/fixtures/renderer-parity/m2"
import type {
  ComparisonCase,
  ComparisonManifest,
} from "../tests/fixtures/renderer-parity/types"

export async function prepareM2SocketModel(root: string) {
  const publicRoot = join(root, "stories/renderer-comparison/public")
  const assets = join(publicRoot, "assets/amphenol")
  const cache = join(root, ".renderer-comparison-cache/m2")
  await mkdir(cache, { recursive: true })
  await mkdir(assets, { recursive: true })
  const step = join(cache, "MDT350M01401VT.stp")
  if (!(await Bun.file(step).exists())) {
    const response = await fetch(m2SocketUrl, {
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      throw new Error(
        `M.2 STEP download returned HTTP ${response.status}: ${m2SocketUrl}`,
      )
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (createHash("sha256").update(bytes).digest("hex") !== m2SocketSha256) {
      throw new Error("M.2 STEP SHA-256 mismatch; refusing changed model")
    }
    await Bun.write(step, bytes)
  }
  if (
    createHash("sha256")
      .update(await readFile(step))
      .digest("hex") !== m2SocketSha256
  ) {
    throw new Error(`Cached M.2 STEP SHA-256 mismatch: ${step}`)
  }
  const modelPath = join(assets, "MDT350M01401VT.stp")
  await copyFile(step, modelPath)
  return modelPath
}

export async function prepareM2Daughtercard(root: string) {
  await prepareM2SocketModel(root)
  const publicRoot = join(root, "stories/renderer-comparison/public")
  const generated = join(publicRoot, "generated")
  await mkdir(generated, { recursive: true })
  const exporterPackage = await Bun.file(
    new URL("../package.json", import.meta.resolve("circuit-json-to-gltf")),
  ).json()
  if (exporterPackage.version !== "0.0.130") {
    throw new Error(
      "M.2 comparisons require pristine circuit-json-to-gltf 0.0.130",
    )
  }
  const daughtercard = new Circuit()
  daughtercard.add(createElement(Daughtercard))
  await daughtercard.renderUntilSettled()
  const daughterJson = daughtercard.getCircuitJson()
  const daughterGlb = await convertCircuitJsonToGltf(daughterJson, {
    format: "glb",
    boardTextureResolution: 1024,
  })
  if (!(daughterGlb instanceof ArrayBuffer)) {
    throw new Error("Daughtercard export did not return binary GLB")
  }
  await Bun.write(join(generated, "m2-daughtercard.glb"), daughterGlb)
  await Bun.write(
    join(generated, "m2-daughtercard.circuit.json"),
    JSON.stringify(daughterJson, null, 2),
  )

  const definition: ComparisonCase = {
    id: "m2-daughtercard",
    title: "M.2 M-key: upright card in Amphenol MDT350M01401VT",
    description:
      "A shared-source 0.8 mm M-key card with 67 edge contacts, mounted +90 degrees about Y into the real Amphenol socket. The 1.50 mm fingers start 0.50 mm behind the edge and cover the measured spring engagement band; the 3.50 mm-deep key notch has an R0.60 root. The insertion edge seats on the actual slot floor, 2.661 mm below the rim, not at the notch depth. The unchanged vendor STEP is downloaded by URL; host pads and locating holes follow its drawing. Mechanical example only: the family model's revision fit is not certified, springs are undeflected, and bevels, retention hardware and electrical routing are omitted. Source URLs, design choices and measured datums are in the referenced m2.ts file.",
    category: "rotation",
    sourceFile:
      "tests/fixtures/renderer-parity/circuits/m2-carrier.circuit.tsx",
    targetName: "CARD1",
    physicalExpectation: {
      correctRenderer: "viewer",
      correct:
        "The 0.8 mm card rises from the real socket, with its insertion edge on the slot floor and its M-key notch around the key. The socket solder feet meet the host pads.",
      incorrect:
        "The upstream exporter reverses the card's Y rotation: the card extends below the carrier instead of rising out of the socket.",
    },
    camera: { target: [0, 0, 10], span: 62 },
  }
  const { circuitJson, target, sourceCode } = await compileRendererCircuit(
    definition,
    root,
  )
  const assemblyGlb = await convertCircuitJsonToGltf(
    structuredClone(circuitJson),
    {
      format: "glb",
      projectBaseUrl: pathToFileURL(`${publicRoot}/`).href,
      boardTextureResolution: 1024,
    },
  )
  if (!(assemblyGlb instanceof ArrayBuffer)) {
    throw new Error("Assembly export did not return binary GLB")
  }
  await Bun.write(join(generated, "m2-carrier.glb"), assemblyGlb)
  const daughterSource = await readFile(
    join(
      root,
      "tests/fixtures/renderer-parity/circuits/m2-daughtercard.circuit.tsx",
    ),
    "utf8",
  )
  const footprintSource = await readFile(
    join(root, "tests/fixtures/renderer-parity/m2-socket-footprint.tsx"),
    "utf8",
  )
  const datumSource = await readFile(
    join(root, "tests/fixtures/renderer-parity/m2.ts"),
    "utf8",
  )
  const manifest: ComparisonManifest = {
    exporterVersion: exporterPackage.version,
    cases: [
      {
        ...definition,
        circuitJson,
        targetCadId: target.cad_component_id,
        sourceCode,
        sourceReferences: [
          {
            path: "tests/fixtures/renderer-parity/circuits/m2-daughtercard.circuit.tsx",
            sourceCode: daughterSource,
          },
          {
            path: "tests/fixtures/renderer-parity/m2-socket-footprint.tsx",
            sourceCode: footprintSource,
          },
          {
            path: "tests/fixtures/renderer-parity/m2.ts",
            sourceCode: datumSource,
          },
        ],
        glbUrl: "/renderer-comparison/generated/m2-carrier.glb",
        exportMessages: [],
      },
    ],
  }
  await Bun.write(
    join(generated, "m2-manifest.json"),
    JSON.stringify(manifest, null, 2),
  )
  console.log(
    "m2-daughtercard: M-key card and pinned detailed socket generated",
  )
}

if (import.meta.main) {
  await prepareM2Daughtercard(fileURLToPath(new URL("..", import.meta.url)))
}
