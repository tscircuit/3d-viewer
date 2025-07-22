import { Grid, OrbitControls } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import type * as React from "react"
import { forwardRef, useMemo, useState } from "react"
import * as THREE from "three"
import packageJson from "../package.json"
import { CubeWithLabeledSides } from "./three-components/cube-with-labeled-sides"

export const RotationTracker = () => {
  useFrame(({ camera }) => {
    window.TSCI_MAIN_CAMERA_ROTATION = camera.rotation
  })

  return <></>
}

interface Props {
  autoRotateDisabled?: boolean
  initialCameraPosition?: readonly [number, number, number] | undefined
  clickToInteractEnabled?: boolean
  boardDimensions?: { width?: number; height?: number }
}

export const CadViewerContainer = forwardRef<
  THREE.Object3D,
  React.PropsWithChildren<Props>
>(
  (
    {
      children,
      initialCameraPosition = [5, 5, 5],
      autoRotateDisabled,
      clickToInteractEnabled = false,
      boardDimensions,
    },
    ref,
  ) => {
    const [isInteractionEnabled, setIsInteractionEnabled] = useState(
      !clickToInteractEnabled,
    )

    const gridSectionSize = useMemo(() => {
      if (!boardDimensions) return 10
      const width = boardDimensions.width ?? 0
      const height = boardDimensions.height ?? 0
      const largest = Math.max(width, height)
      const desired = largest * 1.5
      return desired > 10 ? desired : 10
    }, [boardDimensions])

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
          scene={{ up: new THREE.Vector3(0, 0, 1) }}
          camera={{
            up: new THREE.Vector3(0, 0, 1),
            position: initialCameraPosition,
          }}
        >
          <RotationTracker />
          {isInteractionEnabled && (
            <OrbitControls
              autoRotate={!autoRotateDisabled}
              autoRotateSpeed={1}
            />
          )}
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
            sectionSize={gridSectionSize}
            args={[gridSectionSize, gridSectionSize]}
          />
          <object3D ref={ref}>{children}</object3D>
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
        {clickToInteractEnabled && !isInteractionEnabled && (
          <button
            type="button"
            onClick={() => setIsInteractionEnabled(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setIsInteractionEnabled(true)
              }
            }}
            style={{
              position: "absolute",
              inset: 0,
              cursor: "pointer",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                color: "white",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "16px",
                fontFamily: "sans-serif",
                pointerEvents: "none",
              }}
            >
              Click to Interact
            </div>
          </button>
        )}
      </div>
    )
  },
)
