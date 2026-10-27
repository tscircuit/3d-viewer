import { Circuit, assembly, jscad } from "@tscircuit/core"
import type { PcbBoard } from "circuit-json"
import { createRoot } from "react-dom/client"
import { CadViewer } from "../../src/CadViewer"
import type { CameraController } from "../../src/hooks/cameraAnimation"
import { createFlexEnclosureXray } from "../../stories/fixtures/create-flex-enclosure-xray"

declare global {
  interface Window {
    enclosureCamera?: CameraController | null
  }
}

const params = new URLSearchParams(location.search)
const material = (params.get("material") ?? "flex") as PcbBoard["material"]
const engine = params.get("engine") ?? "manifold"
localStorage.setItem("cadViewerEngine", engine)

function createFlatBoard() {
  const circuit = new Circuit()
  circuit.add(
    <assembly.device name="flat-enclosure">
      <board
        width={20}
        height={8}
        thickness={1.6}
        material={material}
        routingDisabled
        schematicDisabled
      />
      <assembly.printedpart
        name="enclosure"
        jscad={
          <jscad.colorize color="#bfc5c7">
            <jscad.subtract>
              <jscad.cuboid size={[22, 10, 2.2]} />
              <jscad.cuboid size={[20.4, 8.4, 1.9]} />
            </jscad.subtract>
          </jscad.colorize>
        }
      />
    </assembly.device>,
  )
  const json = circuit.getCircuitJson()
  for (const layer of ["top", "bottom"] as const) {
    json.push({
      type: "pcb_trace",
      pcb_trace_id: layer,
      route: [
        { route_type: "wire", x: -9, y: -3, width: 0.5, layer },
        { route_type: "wire", x: 9, y: -3, width: 0.5, layer },
        { route_type: "wire", x: 9, y: 3, width: 0.5, layer },
        { route_type: "wire", x: -9, y: 3, width: 0.5, layer },
      ],
    })
  }
  return json
}

const flat = params.has("flat")
const json = flat ? createFlatBoard() : createFlexEnclosureXray(material)
createRoot(document.getElementById("root")!).render(
  <div style={{ height: "100vh" }}>
    <CadViewer
      circuitJson={json}
      foldPcbs={!flat}
      autoRotateDisabled
      onCameraControllerReady={(controller) => {
        window.enclosureCamera = controller
      }}
    />
  </div>,
)
