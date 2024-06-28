import {
  Canvas,
  useFrame,
  extend,
  useThree,
  useLoader,
} from "@react-three/fiber"
import { Suspense, useEffect, useRef, useState } from "react"
import { OrbitControls, Grid, Outlines } from "@react-three/drei"
import * as THREE from "three"
import { CubeWithLabeledSides } from "./three-components/cube-with-labeled-sides"
import { soupToJscadShape } from "./soup-to-3d"
import soup from "./bug-pads-and-traces.json"
// import soup from "./plated-hole-board.json"
import stlSerializer from "@jscad/stl-serializer"
// import { STLLoader } from "three/examples/jsm/loaders/STLLoader"
import { STLLoader } from "three-stdlib"

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

function blobToBase64Url(blob: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const jscadGeom = soupToJscadShape(soup as any)

const stlPromises = jscadGeom.map((a) => {
  const rawData = stlSerializer.serialize({ binary: true }, [a])

  const blobData = new Blob(rawData)

  const $urlForStl = blobToBase64Url(blobData)

  return $urlForStl.then((url) => ({
    url,
    color: a.color,
  }))
})

// const entities = entitiesFromSolids({}, ...soupToJscadShape(soup as any))
// console.log(entities)

function TestStl({
  url,
  color,
  index,
}: {
  index: number
  url: string
  color: any
}) {
  const geom = useLoader(STLLoader, url)
  const mesh = useRef<THREE.Mesh>()

  return (
    <mesh ref={mesh}>
      <primitive object={geom} attach="geometry" />
      <meshStandardMaterial
        color={color}
        transparent={index === 0}
        opacity={index === 0 ? 0.8 : 1}
      />
      {/* <Outlines thickness={0.05} color="black" opacity={0.25} /> */}
    </mesh>
  )
}

function Scene() {
  const [stls, setStls] = useState<Array<{
    url: string
    color: number[]
  }> | null>(null)
  useEffect(() => {
    async function loadStls() {
      const stls = await Promise.all(stlPromises)
      setStls(stls as any)
    }
    loadStls()
  }, [])
  return (
    <>
      <OrbitControls />
      <ambientLight intensity={Math.PI / 2} />
      <pointLight position={[-10, -10, 10]} decay={0} intensity={Math.PI / 4} />
      {/* <Box /> */}
      {(stls ?? []).map((stl, i) => (
        <TestStl index={i} {...stl} key={stl.url} />
      ))}
      {/* <axesHelper args={[5]} /> */}
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
