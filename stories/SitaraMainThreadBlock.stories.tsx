import { useEffect, useState } from "react"
import type { CircuitJson } from "circuit-json"
import { CadViewer } from "src/CadViewer"
import tmds62levmCircuitJsonUrl from "./assets/repros/tmds62levm-full-board-3d.circuit.json.gz?url"

async function loadTmds62levmCircuitJson(): Promise<CircuitJson> {
  const response = await fetch(tmds62levmCircuitJsonUrl)
  if (!response.ok) {
    throw new Error(`Failed to load TMDS62LEVM fixture: ${response.status}`)
  }
  if (!response.body) {
    throw new Error("TMDS62LEVM fixture response has no body")
  }

  const decompressedResponse = new Response(
    response.body.pipeThrough(new DecompressionStream("gzip")),
  )
  return decompressedResponse.json()
}

function getReproStatusMessage({
  blockedForMs,
  fixtureIsLoaded,
  loadErrorMessage,
}: {
  blockedForMs?: number
  fixtureIsLoaded: boolean
  loadErrorMessage?: string
}): string {
  if (loadErrorMessage) return loadErrorMessage
  if (blockedForMs !== undefined)
    return `Main thread blocked for ${blockedForMs} ms`
  return fixtureIsLoaded ? "Fixture ready" : "Loading fixture…"
}

export const Tmds62levmMainThreadBlock = () => {
  const [loadedCircuitJson, setLoadedCircuitJson] = useState<CircuitJson>()
  const [renderedCircuitJson, setRenderedCircuitJson] = useState<CircuitJson>()
  const [blockedForMs, setBlockedForMs] = useState<number>()
  const [loadErrorMessage, setLoadErrorMessage] = useState<string>()

  useEffect(() => {
    let isMounted = true

    loadTmds62levmCircuitJson()
      .then((circuitJson) => {
        if (isMounted) setLoadedCircuitJson(circuitJson)
      })
      .catch((loadError) => {
        if (!isMounted) return
        setLoadErrorMessage(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load TMDS62LEVM fixture",
        )
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div
      style={{ display: "grid", height: "100vh", gridTemplateRows: "auto 1fr" }}
    >
      <div
        style={{ alignItems: "center", display: "flex", gap: 12, padding: 12 }}
      >
        <button
          disabled={!loadedCircuitJson}
          onClick={() => {
            if (!loadedCircuitJson) return
            setBlockedForMs(undefined)
            const renderStartedAtMs = performance.now()
            setTimeout(() => {
              setBlockedForMs(Math.round(performance.now() - renderStartedAtMs))
            }, 0)
            setRenderedCircuitJson(loadedCircuitJson)
          }}
          type="button"
        >
          Render TMDS62LEVM
        </button>
        <output aria-live="polite">
          {getReproStatusMessage({
            blockedForMs,
            fixtureIsLoaded: loadedCircuitJson !== undefined,
            loadErrorMessage,
          })}
        </output>
      </div>
      {renderedCircuitJson ? (
        <CadViewer circuitJson={renderedCircuitJson} />
      ) : null}
    </div>
  )
}

export default {
  title: "Repros/Sitara main-thread block",
  component: Tmds62levmMainThreadBlock,
}
