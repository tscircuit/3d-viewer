import { Canvas, useFrame, extend, useThree } from "@react-three/fiber"
import { useRef, useState } from "react"
import { OrbitControls, Grid } from "@react-three/drei"
import * as THREE from "three"
import { CubeWithLabeledSides } from "./three-components/cube-with-labeled-sides"

extend({ OrbitControls })

function Box(props) {
  const meshRef = useRef<THREE.Mesh>()
  useFrame((state, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x += delta
    meshRef.current.rotation.y += delta
  })

  return (
    <mesh ref={meshRef} {...props}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <OrbitControls />
      <ambientLight intensity={Math.PI / 2} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        decay={0}
        intensity={Math.PI}
      />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <Box />
      <Grid infiniteGrid={true} cellSize={1} sectionSize={10} />
    </>
  )
}

export const RotationTracker = ({ onRotationChange }: any) => {
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
        <Canvas camera={{ position: [1, 1, 1] }}>
          <ambientLight intensity={Math.PI / 2} />
          <CubeWithLabeledSides />
        </Canvas>
      </div>
      <Canvas camera={{ position: [5, 5, 5] }}>
        <RotationTracker />
        <Scene />
      </Canvas>
    </div>
  )
}
