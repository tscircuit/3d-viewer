import React, { useState, useEffect } from "react"
import { CadViewer } from "../src/CadViewer"
import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import {
  generatePcbTexture,
  cleanupTextureUrl,
} from "../src/utils/pcb-texture-generator"

const createDemoCircuit = async (): Promise<AnyCircuitElement[]> => {
  const circuit = new Circuit()

  circuit.add(
    <board width="40mm" height="40mm">
      <resistor
        name="R1"
        footprint="0805"
        pcbX={-10}
        pcbY={-5}
        resistance="10k"
      />
      <resistor
        name="R2"
        footprint="0805"
        pcbX={10}
        pcbY={-5}
        resistance="10k"
      />
      <capacitor
        name="C1"
        footprint="0603"
        pcbX={-10}
        pcbY={5}
        capacitance="100nF"
      />
      <capacitor
        name="C2"
        footprint="0603"
        pcbX={10}
        pcbY={5}
        capacitance="100nF"
      />
    </board>,
  )

  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

export const PcbTextureDemo = () => {
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[] | null>(
    null,
  )
  const [textureUrl, setTextureUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let currentTextureUrl: string | null = null

    const renderCircuit = async () => {
      try {
        setLoading(true)

        const json = await createDemoCircuit()
        if (cancelled) return

        setCircuitJson(json)

        // Generate texture
        const texture = await generatePcbTexture(json, 1024, 1024)
        if (cancelled) {
          cleanupTextureUrl(texture)
          return
        }

        currentTextureUrl = texture
        setTextureUrl(texture)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          console.error("Error rendering circuit:", err)
          setError(err instanceof Error ? err.message : "Unknown error")
          setLoading(false)
        }
      }
    }

    renderCircuit()

    // Cleanup
    return () => {
      cancelled = true
      if (currentTextureUrl) {
        cleanupTextureUrl(currentTextureUrl)
      }
    }
  }, [])

  if (loading) {
    return <div>Loading PCB texture demo...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (!circuitJson) {
    return <div>No circuit data</div>
  }

  return (
    <div>
      <div
        style={{ marginBottom: "20px", padding: "10px", background: "#f0f0f0" }}
      >
        <h3>PCB Texture Support Demo</h3>
        <p>
          This demonstrates PCB texture generation using circuit-to-svg and
          resvg-wasm.
        </p>
        {textureUrl && (
          <details>
            <summary>View Generated Texture</summary>
            <img
              src={textureUrl}
              alt="Generated PCB Texture"
              style={{ maxWidth: "100%", border: "1px solid #ccc" }}
            />
          </details>
        )}
      </div>
      <CadViewer circuitJson={circuitJson} />
    </div>
  )
}

export default {
  title: "Features/PCB Texture Support",
  component: PcbTextureDemo,
}
