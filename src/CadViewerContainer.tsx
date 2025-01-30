import type * as React from "react"
import type * as THREE from "three"
import { useHelper, Grid, OrbitControls } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import packageJson from "../package.json"
import { CubeWithLabeledSides } from "./three-components/cube-with-labeled-sides"
import { forwardRef, Suspense, useEffect, useRef } from "react"

export const RotationTracker = () => {
  useFrame(({ camera }) => {
    window.TSCI_MAIN_CAMERA_ROTATION = camera.rotation
  })

  return <></>
}

import { Html } from "@react-three/drei"

interface Props {
  hoveredComponent: {
    cad_component_id: string
    name: string
    mousePosition: [number, number, number]
  } | null
  autoRotateDisabled?: boolean
}

export const CadViewerContainer = forwardRef<
  THREE.Object3D,
  React.PropsWithChildren<Props>
>(({ children, hoveredComponent, autoRotateDisabled }, ref) => {
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
        <OrbitControls autoRotate={!autoRotateDisabled} autoRotateSpeed={1} />
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
        <object3D ref={ref}>{children}</object3D>
        {hoveredComponent && (
          <Html
            position={hoveredComponent.mousePosition}
            style={{
              fontFamily: "sans-serif",
              transform: "translate3d(50%, 50%, 0)",
              backgroundColor: "white",
              padding: "5px",
              borderRadius: "3px",
              pointerEvents: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
            }}
          >
            {hoveredComponent.name}
          </Html>
        )}
      </Canvas>
      <div
        style={{
          position: "absolute",
          right: 24,
          bottom: 24,
          fontFamily: "sans-serif",
          color: "white",
          WebkitTextStroke: "0.5px rgba(0, 0, 0, 0.5)",
          fontSize: 11,
        }}
      >
        @{packageJson.version}
      </div>
    </div>
  )
})
