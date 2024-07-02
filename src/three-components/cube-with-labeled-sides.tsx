import React, { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import * as THREE from "three"

declare global {
  interface Window {
    TSCI_MAIN_CAMERA_ROTATION: THREE.Euler
  }
}
window.TSCI_MAIN_CAMERA_ROTATION = new THREE.Euler(0, 0, 0)

function computePointInFront(rotationVector, distance) {
  // Create a quaternion from the rotation vector
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rotationVector.x, rotationVector.y, rotationVector.z)
  )

  // Create a vector pointing forward (along the negative z-axis)
  const forwardVector = new THREE.Vector3(0, 0, 1)

  // Apply the rotation to the forward vector
  forwardVector.applyQuaternion(quaternion)

  // Scale the rotated vector by the distance
  const result = forwardVector.multiplyScalar(distance)

  return result
}

export const CubeWithLabeledSides = ({}: any) => {
  const ref = useRef<THREE.Mesh>()
  const rotationTrackingRef = useRef({ lastRotation: new THREE.Euler() })
  useFrame((state, delta) => {
    if (!ref.current) return

    const mainRot = window.TSCI_MAIN_CAMERA_ROTATION

    // Use window.TSCI_CAMERA_ROTATION to compute the position of the camera
    const cameraPosition = computePointInFront(mainRot, 2)

    state.camera.position.copy(cameraPosition)
    state.camera.lookAt(0, 0, 0)
  })
  return (
    <mesh ref={ref as any} rotation={[Math.PI / 2, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="white" />
      <Text position={[0, 0, 0.51]} fontSize={0.25} color="black">
        Front
      </Text>
      <Text
        position={[0, 0, -0.51]}
        fontSize={0.25}
        color="black"
        rotation={[0, Math.PI, 0]}
      >
        Back
      </Text>
      <Text
        position={[0.51, 0, 0]}
        fontSize={0.25}
        color="black"
        rotation={[0, Math.PI / 2, 0]}
      >
        Right
      </Text>
      <Text
        position={[-0.51, 0, 0]}
        fontSize={0.25}
        color="black"
        rotation={[0, -Math.PI / 2, 0]}
      >
        Left
      </Text>
      <Text
        position={[0, 0.51, 0]}
        fontSize={0.25}
        color="black"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        Top
      </Text>
      <Text
        position={[0, -0.51, 0]}
        fontSize={0.25}
        color="black"
        rotation={[Math.PI / 2, 0, 0]}
      >
        Bottom
      </Text>
      <lineSegments
        args={[new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))]}
        material={
          new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 2,
          })
        }
      />
    </mesh>
  )
}

// const LabeledCubeScene = () => {
//   return (
//     <Canvas camera={{ position: [1.5, 1.5, 1.5] }}>
//       <ambientLight intensity={0.5} />
//       <pointLight position={[10, 10, 10]} />
//       <LabeledCube />
//       <OrbitControls />
//     </Canvas>
//   )
// }

// export default LabeledCubeScene
