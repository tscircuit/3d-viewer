import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { Text } from "src/react-three/Text"
import { useFrame, useThree } from "src/react-three/ThreeContext"

declare global {
  interface Window {
    TSCI_MAIN_CAMERA_ROTATION: THREE.Euler
    TSCI_MAIN_CAMERA_QUATERNION: THREE.Quaternion
  }
}
if (typeof window !== "undefined") {
  window.TSCI_MAIN_CAMERA_ROTATION = new THREE.Euler(0, 0, 0)
  window.TSCI_MAIN_CAMERA_QUATERNION = new THREE.Quaternion()
}

function computePointInFront(quaternion: THREE.Quaternion, distance: number) {
  const forwardVector = new THREE.Vector3(0, 0, 1)
  forwardVector.applyQuaternion(quaternion)
  return forwardVector.multiplyScalar(distance)
}

export const CubeWithLabeledSides = ({}: any) => {
  const { camera, scene } = useThree()

  useEffect(() => {
    if (!scene) return
    const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI / 2)
    scene.add(ambientLight)
    return () => {
      scene.remove(ambientLight)
    }
  }, [scene])

  useFrame(() => {
    if (!camera) return

    const mainQuaternion = window.TSCI_MAIN_CAMERA_QUATERNION
    const cameraPosition = computePointInFront(mainQuaternion, 2)

    camera.position.copy(cameraPosition)
    camera.lookAt(0, 0, 0)
  })

  const group = useMemo(() => {
    const g = new THREE.Group()
    g.rotation.fromArray([Math.PI / 2, 0, 0])

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: "white" }),
    )
    g.add(box)

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }),
    )
    g.add(edges)
    return g
  }, [])

  useEffect(() => {
    if (!scene) return
    scene.add(group)
    return () => {
      scene.remove(group)
    }
  }, [scene, group])

  return (
    <>
      <Text
        parent={group}
        position={[0, 0, 0.51]}
        fontSize={0.25}
        color="black"
      >
        Front
      </Text>
      <Text
        parent={group}
        position={[0, 0, -0.51]}
        fontSize={0.25}
        color="black"
        rotation={[0, Math.PI, 0]}
      >
        Back
      </Text>
      <Text
        parent={group}
        position={[0.51, 0, 0]}
        fontSize={0.25}
        color="black"
        rotation={[0, Math.PI / 2, 0]}
      >
        Right
      </Text>
      <Text
        parent={group}
        position={[-0.51, 0, 0]}
        fontSize={0.25}
        color="black"
        rotation={[0, -Math.PI / 2, 0]}
      >
        Left
      </Text>
      <Text
        parent={group}
        position={[0, 0.51, 0]}
        fontSize={0.25}
        color="black"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        Top
      </Text>
      <Text
        parent={group}
        position={[0, -0.51, 0]}
        fontSize={0.25}
        color="black"
        rotation={[Math.PI / 2, 0, 0]}
      >
        Bottom
      </Text>
    </>
  )
}
