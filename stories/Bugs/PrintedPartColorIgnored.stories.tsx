import { Circuit, assembly, jscad } from "@tscircuit/core"
import { CadViewerJscad } from "src/CadViewerJscad"
import { AppearanceProvider } from "src/contexts/appearance-context"
import { CameraControllerProvider } from "src/contexts/CameraControllerContext"
import { LayerVisibilityProvider } from "src/contexts/LayerVisibilityContext"
import { ToastProvider } from "src/contexts/ToastContext"
import { Vector3 } from "three"

// Regression for Done Dot's red status lens: the CAD color prop must work
// without also embedding the same color in the JSCAD geometry.
const circuit = new Circuit()
circuit.add(
  <assembly.device name="printed-part-color-repro">
    <board width={24} height={12} />
    <assembly.printedpart
      name="PROP_RED"
      color="#d73e39"
      jscad={<jscad.cylinder radius={2} height={3} center={[-5, 0, 2.3]} />}
    />
    <assembly.printedpart
      name="GEOMETRY_RED"
      color="#d73e39"
      jscad={
        <jscad.colorize color="#d73e39">
          <jscad.cylinder radius={2} height={3} center={[5, 0, 2.3]} />
        </jscad.colorize>
      }
    />
  </assembly.device>,
)
const circuitJson = circuit.getCircuitJson()
const cameraTarget = new Vector3(0, 0, 0)

export const SameRedColor = () => (
  <div style={{ width: 1000, fontFamily: "sans-serif" }}>
    <h2>Printed part color (JSCAD)</h2>
    <p>
      Both cylinders should be red. Left: printedpart color prop only. Right:
      printedpart color prop plus JSCAD colorize with the same red.
    </p>
    <div style={{ height: 640 }}>
      <CameraControllerProvider defaultTarget={cameraTarget}>
        <LayerVisibilityProvider>
          <AppearanceProvider>
            <ToastProvider>
              <CadViewerJscad
                circuitJson={circuitJson}
                autoRotateDisabled
                clickToInteractEnabled={false}
              />
            </ToastProvider>
          </AppearanceProvider>
        </LayerVisibilityProvider>
      </CameraControllerProvider>
    </div>
  </div>
)

export default {
  title: "Bugs/PrintedPartColorIgnored",
  component: SameRedColor,
}
