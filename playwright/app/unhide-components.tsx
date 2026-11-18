import { Circuit } from "@tscircuit/core"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { CadViewer } from "../../src/CadViewer"

const circuit = new Circuit()
circuit.add(
  <board width="36mm" height="24mm" routingDisabled>
    <chip name="U1" footprint="soic8" pcbX={-9} />
    <chip name="U2" footprint="soic8" />
    <chip name="U3" footprint="soic8" pcbX={9} />
  </board>,
)
const circuitJson = circuit.getCircuitJson()
const names = new Map(
  circuitJson.flatMap((element) =>
    element.type === "source_component"
      ? [[element.source_component_id, element.name] as const]
      : [],
  ),
)
const components = circuitJson
  .filter((element) => element.type === "cad_component")
  .map((element) => ({
    id: element.cad_component_id,
    name: names.get(element.source_component_id)!,
    position: element.position,
  }))
const position = [32, -38, 42] as const
const camera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.1,
  1000,
)
camera.position.set(...position)
camera.up.set(0, 0, 1)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()

declare global {
  interface Window {
    __unhide: {
      position: (name: string) => { x: number; y: number }
      visibleNames: () => string[]
    }
  }
}
window.__unhide = {
  position: (name) => {
    const component = components.find((component) => component.name === name)!
    const point = new THREE.Vector3(
      component.position.x,
      component.position.y,
      component.position.z + 1,
    ).project(camera)
    return {
      x: ((point.x + 1) * innerWidth) / 2,
      y: ((1 - point.y) * innerHeight) / 2,
    }
  },
  visibleNames: () =>
    components
      .filter(({ id }) => {
        let visible = false
        window.__TSCIRCUIT_THREE_OBJECT?.traverse((object) => {
          if (
            object.userData.cad_component_id !== id ||
            !object.children.length
          )
            return
          let current: THREE.Object3D | null = object
          while (current) {
            if (!current.visible) return
            current = current.parent
          }
          visible = true
        })
        return visible
      })
      .map(({ name }) => name),
}

localStorage.setItem(
  "cadViewerEngine",
  new URLSearchParams(location.search).get("engine") ?? "manifold",
)
createRoot(document.getElementById("root")!).render(
  <div style={{ width: "100vw", height: "100vh", background: "#151515" }}>
    <CadViewer
      circuitJson={circuitJson}
      autoRotateDisabled
      onCameraControllerReady={(controller) =>
        controller?.animateTo({
          position,
          target: [0, 0, 0],
          up: [0, 0, 1],
          durationMs: 0,
        })
      }
    />
  </div>,
)
