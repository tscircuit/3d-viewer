import React, { StrictMode, useEffect } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { CadViewer } from "../../src/CadViewer"
import { CadViewerContainer } from "../../src/CadViewerContainer"
import { AppearanceProvider } from "../../src/contexts/appearance-context"
import { CameraControllerProvider } from "../../src/contexts/CameraControllerContext"
import { useThree } from "../../src/react-three/ThreeContext"
import { SectionProvider, useSection } from "../../src/sections/SectionContext"
import { SectionPanel } from "../../src/sections/SectionPanel"

function Fixture() {
  const { rootObject, camera } = useThree()
  ;(window as any).__sectionCamera = camera
  useEffect(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-12, -10)
    shape.lineTo(12, -10)
    shape.lineTo(12, 10)
    shape.lineTo(-12, 10)
    shape.closePath()
    const hole = new THREE.Path()
    hole.absarc(0, 0, 5, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 16,
      bevelEnabled: false,
    })
    geometry.translate(0, 0, -8)
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0x4d90b5 }),
    )
    rootObject.add(mesh)
    return () => {
      rootObject.remove(mesh)
      geometry.dispose()
      mesh.material.dispose()
    }
  }, [rootObject])
  return null
}
function Probe() {
  const section = useSection()
  return (
    <>
      <button
        type="button"
        data-testid="start-test-section"
        style={{ position: "absolute", bottom: 24, left: 12 }}
        onClick={() => {
          section!.setSpec({ axis: "x", offset: 0, flipped: false })
          section!.setEditing(true)
        }}
      >
        Start test section
      </button>
      <output
        data-testid="section-state"
        style={{ position: "absolute", bottom: 0, color: "white" }}
      >
        {JSON.stringify(section?.spec)}
      </output>
    </>
  )
}
const params = new URLSearchParams(location.search)
const engine = params.get("engine")
if (engine) localStorage.setItem("cadViewerEngine", engine)
const board = [
  {
    type: "pcb_board",
    pcb_board_id: "b",
    center: { x: 0, y: 0 },
    width: 30,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
  },
]
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div style={{ width: "100vw", height: "100vh", background: "#151515" }}>
      {engine ? (
        <CadViewer
          circuitJson={engine === "glb" ? undefined : board}
          glbUrl={engine === "glb" ? "section-test.glb" : undefined}
          autoRotateDisabled
        />
      ) : (
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <AppearanceProvider>
            <SectionProvider>
              <CadViewerContainer
                initialCameraPosition={[40, -45, 35]}
                autoRotateDisabled
              >
                <Fixture />
              </CadViewerContainer>
              <SectionPanel />
              <Probe />
            </SectionProvider>
          </AppearanceProvider>
        </CameraControllerProvider>
      )}
    </div>
  </StrictMode>,
)
