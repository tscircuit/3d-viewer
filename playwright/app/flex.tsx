import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { CadViewer } from "../../src/CadViewer"
import type { AnyCircuitElement } from "circuit-json"
import circuitJson from "../../stories/fixtures/three-disc-flex.json"

const mode = new URLSearchParams(location.search).get("mode")
const input = (
  mode === "rigid"
    ? circuitJson.filter(
        (element) =>
          element.type !== "pcb_bend" && element.type !== "pcb_stiffener",
      )
    : mode === "invalid"
      ? circuitJson.map((element) =>
          element.type === "pcb_bend"
            ? { ...element, bend_radius: -1 }
            : element,
        )
      : circuitJson
) as AnyCircuitElement[]
const before = JSON.stringify(input)
;(window as any).readFlexScene = () => {
  const scene =
    window.__TSCIRCUIT_THREE_OBJECT?.getObjectByName("flex-pcb-scene")
  if (!scene) return null
  const bounds = new THREE.Box3().setFromObject(scene)
  return {
    folded: scene.userData.foldPcbs,
    nodes: scene.children[0]?.children.map((node) => ({
      name: node.name,
      visible: node.visible,
      center: new THREE.Box3()
        .setFromObject(node)
        .getCenter(new THREE.Vector3())
        .toArray(),
    })),
    size: bounds.getSize(new THREE.Vector3()).toArray(),
    immutable: before === JSON.stringify(input),
  }
}
createRoot(document.getElementById("root")!).render(
  <div style={{ height: "100vh", width: "100vw" }}>
    <CadViewer circuitJson={input} autoRotateDisabled />
  </div>,
)
