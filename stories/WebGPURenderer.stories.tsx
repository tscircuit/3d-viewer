import { CadViewer } from "src/CadViewer"
import circuitJson from "./assets/soic-with-traces.json"

export default {
  title: "WebGPU Renderer",
}

export const WithWebGPU = () => (
  <CadViewer circuitJson={circuitJson as any} useWebGPU={true} />
)

export const WithWebGL = () => (
  <CadViewer circuitJson={circuitJson as any} useWebGPU={false} />
)
