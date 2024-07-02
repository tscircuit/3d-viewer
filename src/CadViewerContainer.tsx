import {
  Canvas,
  useFrame,
  extend,
  useThree,
  useLoader,
} from "@react-three/fiber"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { OrbitControls, Grid, Outlines } from "@react-three/drei"
import * as THREE from "three"
import { CubeWithLabeledSides } from "./three-components/cube-with-labeled-sides"
import { createBoardGeomFromSoup } from "./soup-to-3d"
import soup from "./bug-pads-and-traces.json"
// import soup from "./plated-hole-board.json"
import stlSerializer from "@jscad/stl-serializer"
// import { STLLoader } from "three/examples/jsm/loaders/STLLoader"
import { MTLLoader, OBJLoader, STLLoader } from "three-stdlib"

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
    </div>
  )
}
