import React, { useState, useEffect } from "react"
import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"
import { generatePcbTexture } from "src/utils/svg-texture-utils"

const createCircuitWithTexture = async () => {
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
      <chip
        name="U1"
        footprint="soic8"
        pcbX={0}
        pcbY={0}
      />
      <trace from=".U1 > .pin1" to=".R1 > .pin1" />
      <trace from=".U1 > .pin8" to=".C1 > .pin2" />
      <trace from=".U1 > .pin4" to=".R2 > .pin2" />
      <trace from=".U1 > .pin5" to=".C2 > .pin1" />
    </board>,
  )

  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

export const PcbTextureDemo = () => {
  const [circuitJson, setCircuitJson] = useState<any>(null)
  const [textureUrl, setTextureUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const renderCircuitWithTexture = async () => {
      try {
        setLoading(true)
        const json = await createCircuitWithTexture()
        setCircuitJson(json)

        // Generate texture from circuit elements
        const texture = await generatePcbTexture(json, 1024, 1024)
        setTextureUrl(texture)
        setLoading(false)
      } catch (err) {
        console.error("Error rendering circuit with texture:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
        setLoading(false)
      }
    }

    renderCircuitWithTexture()
  }, [])

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading circuit and generating PCB texture...</div>
  }

  if (error) {
    return <div style={{ padding: "20px", color: "red" }}>Error: {error}</div>
  }

  if (!circuitJson) {
    return <div>No circuit data</div>
  }

  return (
    <div>
      <div style={{ marginBottom: "20px", padding: "10px", background: "#f0f0f0" }}>
        <h3>PCB Texture Proof of Work</h3>
        <p>This story demonstrates the PCB texture generation feature using circuit-to-svg and resvg-wasm.</p>
        {textureUrl && (
          <div>
            <p>✅ Texture generated successfully!</p>
            <details>
              <summary>View Generated Texture (Click to expand)</summary>
              <img 
                src={textureUrl} 
                alt="Generated PCB Texture" 
                style={{ maxWidth: "400px", border: "1px solid #ccc", marginTop: "10px" }}
              />
            </details>
          </div>
        )}
      </div>
      <CadViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default {
  title: "Features/PCB Texture Support",
  component: PcbTextureDemo,
}
