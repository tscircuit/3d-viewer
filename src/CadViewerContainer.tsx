import { Grid, OrbitControls } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import packageJson from "../package.json"
import { CubeWithLabeledSides } from "./three-components/cube-with-labeled-sides"

export const RotationTracker = () => {
  useFrame(({ camera }) => {
    window.TSCI_MAIN_CAMERA_ROTATION = camera.rotation
  })

  return <></>
}

export const CadViewerContainer = ({ children }: { children: any }) => {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 120,
          height: 120,
        }}
      >
        <Canvas
          camera={{
            up: [0, 0, 1],
            // rotation: [-Math.PI / 2, 0, 0],
            // lookAt: new THREE.Vector3(0, 0, 0),
            position: [1, 1, 1],
          }}
          style={{ zIndex: 10 }}
        >
          <ambientLight intensity={Math.PI / 2} />
          <CubeWithLabeledSides />
        </Canvas>
      </div>
      <Canvas
        scene={{ up: [0, 0, 1] }}
        camera={{ up: [0, 0, 1], position: [5, 5, 5] }}
      >
        <RotationTracker />
        <OrbitControls autoRotate autoRotateSpeed={1} />
        <ambientLight intensity={Math.PI / 2} />
        <pointLight
          position={[-10, -10, 10]}
          decay={0}
          intensity={Math.PI / 4}
        />
        <Grid
          rotation={[Math.PI / 2, 0, 0]}
          infiniteGrid={true}
          cellSize={1}
          sectionSize={10}
        />
        {children}
      </Canvas>
      <div
        style={{
          position: "absolute",
          right: 24,
          bottom: 24,
          fontFamily: "sans-serif",
          color: "white",
          WebkitTextStroke: "0.5px rgba(0, 0, 0, 0.5)",
          // color: "rgba(255, 255, 255, 0.75)",
          // textShadow:
          //   "0px 0px 1px rgba(0, 0, 0, 0.5), 0px 0px 2px rgba(0, 0, 0, 0.5)",
          fontSize: 11,
        }}
      >
        @{packageJson.version}
      </div>
    </div>
  )
}
