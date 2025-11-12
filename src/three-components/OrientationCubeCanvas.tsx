import { Canvas } from "src/react-three/Canvas"
import * as THREE from "three"
import { useCameraController } from "../contexts/CameraControllerContext"
import { useMemo } from "react"
import { CubeWithLabeledSides } from "./cube-with-labeled-sides"
import { useFrame } from "src/react-three/ThreeContext"

function computePointInFront(
  rotationVector: THREE.Euler,
  distance: number,
): THREE.Vector3 {
  // Create a quaternion from the rotation vector
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rotationVector.x, rotationVector.y, rotationVector.z),
  )

  // Create a vector pointing forward (along the negative z-axis)
  const forwardVector = new THREE.Vector3(0, 0, 1)

  // Apply the rotation to the forward vector
  forwardVector.applyQuaternion(quaternion)

  // Scale the rotated vector by the distance
  const result = forwardVector.multiplyScalar(distance)

  return result
}

const OrientationCubeContent = ({
  orientationCubeCamera,
}: {
  orientationCubeCamera: THREE.Camera
}) => {
  const { mainCameraRef } = useCameraController()

  useFrame(() => {
    if (!orientationCubeCamera) return

    const cameraPosition = computePointInFront(
      mainCameraRef.current?.rotation ?? new THREE.Euler(0, 0, 0),
      2,
    )
    if (cameraPosition?.equals(orientationCubeCamera?.position)) return

    orientationCubeCamera.position.copy(cameraPosition)
    orientationCubeCamera.lookAt(0, 0, 0)
  })

  return <CubeWithLabeledSides />
}

export const OrientationCubeCanvas = () => {
  const { cameraType } = useCameraController()
  const orientationCubeCamera = useMemo(() => {
    if (cameraType === "perspective") {
      return new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    }
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
  }, [cameraType])
  return (
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
        <OrientationCubeContent orientationCubeCamera={orientationCubeCamera} />
      </Canvas>
    </div>
  )
}
