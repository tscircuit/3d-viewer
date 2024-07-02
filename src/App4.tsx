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
import { CommonToThree } from "vendor/@jscadui/format-three"
import { entitiesFromSolids } from "@jscad/regl-renderer"

extend({ OrbitControls })

const jscadGeom = createBoardGeomFromSoup(soup as any)

const threejs = CommonToThree(THREE)(entitiesFromSolids({}, ...jscadGeom), {
  smooth: false,
})
console.log(threejs)

function Scene() {
  return (
    <>
      <OrbitControls />
      <ambientLight intensity={Math.PI / 2} />
      <pointLight position={[-10, -10, 10]} decay={0} intensity={Math.PI / 4} />
      <primitive object={threejs} />
      <Grid
        rotation={[Math.PI / 2, 0, 0]}
        infiniteGrid={true}
        cellSize={1}
        sectionSize={10}
      />
    </>
  )
}

export const RotationTracker = () => {
  useFrame(({ camera }) => {
    window.TSCI_MAIN_CAMERA_ROTATION = camera.rotation
  })

  return <></>
}

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
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
        <Scene />
      </Canvas>
    </div>
  )
}
