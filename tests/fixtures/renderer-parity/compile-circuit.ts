import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { createElement } from "react"
import { Circuit } from "tscircuit"
import type { ComparisonCase } from "./types"

/** Compile the displayed TSX once; both renderers receive its unchanged output. */
export async function compileRendererCircuit(
  definition: ComparisonCase,
  root = resolve(import.meta.dir, "../../.."),
) {
  const sourcePath = resolve(root, definition.sourceFile)
  const source = await import(pathToFileURL(sourcePath).href)
  if (typeof source.default !== "function") {
    throw new Error(
      `Circuit must default-export a component: ${definition.sourceFile}`,
    )
  }
  const circuit = new Circuit()
  circuit.add(createElement(source.default))
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const sources = circuitJson.filter(
    (element) =>
      element.type === "source_component" &&
      element.name === definition.targetName,
  )
  const sourceComponent = sources[0]
  if (
    sources.length !== 1 ||
    !sourceComponent ||
    sourceComponent.type !== "source_component"
  ) {
    throw new Error(
      `Expected one source component named ${definition.targetName}`,
    )
  }
  const targets = circuitJson.filter(
    (element) =>
      element.type === "cad_component" &&
      element.source_component_id === sourceComponent.source_component_id,
  )
  const target = targets[0]
  if (targets.length !== 1 || !target || target.type !== "cad_component") {
    throw new Error(`Expected one CAD component for ${definition.targetName}`)
  }
  if (!circuitJson.some((element) => element.type === "pcb_board")) {
    throw new Error(
      `Physical comparison requires an authored board: ${definition.id}`,
    )
  }
  return {
    circuitJson,
    target,
    sourceCode: await readFile(sourcePath, "utf8"),
  }
}
