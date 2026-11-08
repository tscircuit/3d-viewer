import { useState } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { CadViewer } from "../../src/CadViewer"
import type { CameraController } from "../../src/hooks/cameraAnimation"
import fixture from "../../stories/fixtures/flex17-spur.json?raw"

let mainCamera: THREE.Camera | undefined
let controller: CameraController | null = null
// Observe the real WebGL camera without adding test hooks to viewer code.
const beforeRender = THREE.Scene.prototype.onBeforeRender
THREE.Scene.prototype.onBeforeRender = function (...args) {
  if (this.children.includes(window.__TSCIRCUIT_THREE_OBJECT!))
    mainCamera = args[2]
  beforeRender.apply(this, args)
}

function snapshot() {
  const camera = mainCamera
  const root = window.__TSCIRCUIT_THREE_OBJECT
  if (!camera || !root) return null
  camera.updateMatrixWorld()
  root.updateWorldMatrix(true, true)
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ),
  )
  const bounds = new THREE.Box3()
  let meshes = 0
  let outside = 0
  root.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return
    meshes++
    const box = new THREE.Box3().setFromObject(object)
    bounds.union(box)
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z])
          if (!frustum.containsPoint(new THREE.Vector3(x, y, z))) outside++
  })
  return {
    meshes,
    outside,
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    zoom: (camera as THREE.PerspectiveCamera).zoom,
    center: bounds.getCenter(new THREE.Vector3()).toArray(),
  }
}

declare global {
  interface Window {
    __cameraTest: {
      snapshot: typeof snapshot
      preset: (name: "Top Down") => void
    }
  }
}
window.__cameraTest = {
  snapshot,
  preset: (name) => controller?.animateToPreset(name),
}

const params = new URLSearchParams(location.search)
const engine = params.get("engine")
if (engine) localStorage.setItem("cadViewerEngine", engine)
const projection = params.get("projection")
if (projection) localStorage.setItem("cadViewerCameraType", projection)
const offOriginBoard = [
  {
    type: "pcb_board",
    pcb_board_id: "off-origin",
    center: { x: 417, y: 293 },
    width: 86.4,
    height: 54.6,
    thickness: 1.6,
    num_layers: 2,
  },
]
function App() {
  const [replacement, setReplacement] = useState(false)
  const glb = params.get("fixture") === "glb"
  return (
    <>
      {glb && (
        <button onClick={() => setReplacement(true)} type="button">
          Replace GLB
        </button>
      )}
      <div style={{ width: 1100, height: 800 }}>
        <CadViewer
          autoRotateDisabled
          clickToInteractEnabled={params.has("clickToInteract")}
          circuitJson={
            glb
              ? undefined
              : params.get("fixture") === "board"
                ? offOriginBoard
                : JSON.parse(fixture)
          }
          glbUrl={
            glb ? (replacement ? "replacement.glb" : "initial.glb") : undefined
          }
          onCameraControllerReady={(next) => {
            controller = next
          }}
        />
      </div>
    </>
  )
}
createRoot(document.getElementById("root")!).render(<App />)
