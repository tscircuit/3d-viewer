import { useState } from "react"
import { createRoot } from "react-dom/client"
import { Vector3 } from "three"
import { CameraControllerProvider } from "src/contexts/CameraControllerContext"
import { Canvas } from "src/react-three/Canvas"

const cameraTarget = new Vector3()

function CanvasContextFixture() {
  const [mounted, setMounted] = useState(true)

  return (
    <>
      <button type="button" onClick={() => setMounted(!mounted)}>
        {mounted ? "Unmount canvas" : "Mount canvas"}
      </button>
      {mounted && (
        <CameraControllerProvider defaultTarget={cameraTarget}>
          <Canvas style={{ width: 320, height: 240 }}>{null}</Canvas>
        </CameraControllerProvider>
      )}
    </>
  )
}

createRoot(document.getElementById("root")!).render(<CanvasContextFixture />)
