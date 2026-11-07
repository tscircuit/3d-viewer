import { useEffect, useState } from "react"
import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "src/CadViewer"

const TI_DEMO_ORIGIN = "https://customize-am62a-reference-design-red.vercel.app"
const LMG342X_CIRCUIT_URL = `${TI_DEMO_ORIGIN}/prebuilt-ti-evms/lmg342x-bb-evm/full-board.circuit.json.gz`

function isCircuitJson(
  circuitJson: unknown,
): circuitJson is AnyCircuitElement[] {
  return (
    Array.isArray(circuitJson) &&
    circuitJson.every(
      (element) =>
        typeof element === "object" &&
        element !== null &&
        "type" in element &&
        typeof element.type === "string",
    )
  )
}

async function loadLmg342xCircuitJson(): Promise<AnyCircuitElement[]> {
  const response = await fetch(LMG342X_CIRCUIT_URL)
  if (!response.ok || !response.body) {
    throw new Error(`Failed to load LMG342X circuit: ${response.status}`)
  }

  const decompressedBody = response.body.pipeThrough(
    new DecompressionStream("gzip"),
  )
  const parsedCircuitJson: unknown = await new Response(decompressedBody).json()
  if (!isCircuitJson(parsedCircuitJson)) {
    throw new Error("LMG342X circuit response is not Circuit JSON")
  }

  return parsedCircuitJson.map((element) => {
    if (
      element.type !== "cad_component" ||
      !element.model_step_url?.startsWith("/")
    ) {
      return element
    }

    return {
      ...element,
      model_step_url: `${TI_DEMO_ORIGIN}${element.model_step_url}`,
    }
  })
}

export const FullBoard = () => {
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[]>()
  const [loadError, setLoadError] = useState<Error>()

  useEffect(() => {
    let isActive = true

    void loadLmg342xCircuitJson()
      .then((loadedCircuitJson) => {
        if (isActive) setCircuitJson(loadedCircuitJson)
      })
      .catch((error: Error) => {
        if (isActive) setLoadError(error)
      })

    return () => {
      isActive = false
    }
  }, [])

  if (loadError) return <p>{loadError.message}</p>
  if (!circuitJson) return <p>Loading LMG342X-BB-EVM…</p>

  return <CadViewer autoRotateDisabled circuitJson={circuitJson} />
}

export default {
  title: "Bugs/LMG342X STEP Cache Quota",
}
